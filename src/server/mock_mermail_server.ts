/**
 * Local Mock Mermail Server & Interactive Demo Environment
 * DevRelay Agent Skill
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { devRelayInstance, EmailMessage } from '../index.js';
import { agentWallet } from '../wallet/agent_wallet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets
const publicDir = path.resolve(__dirname, '../../public');
app.use(express.static(publicDir));

const sampleEmailsDir = path.resolve(__dirname, '../../examples/sample_emails');

// Global in-memory audit logs
interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'INGEST' | 'CLASSIFY' | 'APPROVAL_GATE' | 'DISPATCH' | 'WALLET';
  message: string;
  metadata?: any;
}
const auditLogs: AuditLogEntry[] = [];

function recordAudit(type: AuditLogEntry['type'], message: string, metadata?: any) {
  auditLogs.unshift({
    id: `LOG-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    metadata
  });
  if (auditLogs.length > 100) auditLogs.pop();
}

/**
 * GET /api/fixtures
 * Returns list of sample email fixtures
 */
app.get('/api/fixtures', (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(sampleEmailsDir).filter(f => f.endsWith('.json'));
    const fixtures = files.map(file => {
      const content = fs.readFileSync(path.join(sampleEmailsDir, file), 'utf-8');
      const json = JSON.parse(content);
      return {
        filename: file,
        id: json.id,
        from: json.from,
        subject: json.subject,
        timestamp: json.timestamp,
        preview: json.body.substring(0, 120) + '...'
      };
    });
    res.json(fixtures);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fixtures/:filename
 * Reads specific fixture content
 */
app.get('/api/fixtures/:filename', (req: Request, res: Response) => {
  try {
    const filename = String(req.params.filename);
    const filePath = path.join(sampleEmailsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ingest
 * Ingests an email (either via fixture filename or raw email payload)
 */
app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    let email: EmailMessage;

    if (req.body.fixture) {
      const filePath = path.join(sampleEmailsDir, req.body.fixture);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Fixture ${req.body.fixture} not found` });
      }
      email = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else if (req.body.email) {
      email = {
        id: req.body.email.id || `msg_custom_${Date.now()}`,
        from: req.body.email.from || 'custom.developer@org.com',
        to: req.body.email.to || 'support@mermail.com',
        subject: req.body.email.subject || 'Technical issue report',
        body: req.body.email.body || '',
        timestamp: req.body.email.timestamp || new Date().toISOString()
      };
    } else {
      return res.status(400).json({ error: 'Provide fixture or email payload' });
    }

    recordAudit('INGEST', `Received email from ${email.from}: "${email.subject}"`, { emailId: email.id });

    const result = await devRelayInstance.processEmail(email);

    if (result.is_incident) {
      recordAudit('CLASSIFY', `Classified incident ${result.incident_id} as ${result.severity} (SLA: ${result.sla_window})`, {
        incidentId: result.incident_id,
        severity: result.severity,
        targetChannel: result.escalation_recommendation?.target_channel
      });
      recordAudit('APPROVAL_GATE', `Human Approval Gate engaged for ${result.incident_id} (Status: PENDING_APPROVAL)`);
    } else {
      recordAudit('CLASSIFY', `Email ignored (non-technical inquiry): ${result.reason}`);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/incidents
 * List all active/processed incidents
 */
app.get('/api/incidents', (req: Request, res: Response) => {
  res.json({
    incidents: devRelayInstance.getAllIncidents(),
    ignored: devRelayInstance.getAllIgnored()
  });
});

/**
 * GET /api/incidents/:id
 */
app.get('/api/incidents/:id', (req: Request, res: Response) => {
  const incidentId = String(req.params.id);
  const incident = devRelayInstance.getIncident(incidentId);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(incident);
});

/**
 * POST /api/incidents/:id/approve
 * Executes the Human Approval Gate
 */
app.post('/api/incidents/:id/approve', async (req: Request, res: Response) => {
  try {
    const incidentId = String(req.params.id);
    const { operatorName, editedCustomerReply, enableWalletPayout, walletAmount } = req.body;
    recordAudit('APPROVAL_GATE', `Operator '${operatorName || 'Admin'}' authorized execution for ${incidentId}`);

    const report = await devRelayInstance.approveAndExecute(incidentId, {
      operatorName: operatorName || 'Mermail Operator',
      editedCustomerReply,
      enableWalletPayout,
      walletAmount
    });

    recordAudit('DISPATCH', `Dispatched all outbound actions for ${incidentId}`, {
      emailSent: report.email_sent,
      slackDelivered: report.slack_delivered,
      pagerdutyTriggered: report.pagerduty_triggered
    });

    if (report.wallet_payout && report.wallet_payout.status === 'DISPATCHED') {
      recordAudit('WALLET', `Dispatched ${report.wallet_payout.amount_usdc} USDC via Web3 wallet. Tx: ${report.wallet_payout.tx_hash}`);
    }

    res.json({
      success: true,
      report,
      incident: devRelayInstance.getIncident(incidentId)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/incidents/:id/reject
 */
app.post('/api/incidents/:id/reject', (req: Request, res: Response) => {
  try {
    const incidentId = String(req.params.id);
    const { reason } = req.body;
    const incident = devRelayInstance.rejectIncident(incidentId, reason || 'Operator rejected');
    recordAudit('APPROVAL_GATE', `Operator rejected execution for ${incidentId}: ${reason}`);
    res.json({ success: true, incident });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/status
 */
app.get('/api/wallet/status', (req: Request, res: Response) => {
  res.json({
    balance_usdc: agentWallet.getBalance(),
    network: 'Base Mainnet (Layer-2)',
    agent_address: '0x3F8a49c4E350E4a896C773De56Ce96aDb618991D',
    transactions: agentWallet.getTransactions()
  });
});

/**
 * GET /api/audit-logs
 */
app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json(auditLogs);
});

// Seed initial demo data
async function seedInitialDemo() {
  try {
    const defaultFixture = path.join(sampleEmailsDir, 'critical_payment_failure.json');
    if (fs.existsSync(defaultFixture)) {
      const email = JSON.parse(fs.readFileSync(defaultFixture, 'utf-8'));
      await devRelayInstance.processEmail(email);
      recordAudit('INGEST', `[Auto-Seed] Ingested initial benchmark: Alex Payment Failure (POST /v1/checkout/charge)`);
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
}

// Start server
app.listen(PORT, async () => {
  await seedInitialDemo();
  console.log(`\n======================================================`);
  console.log(`🚀 DEVRELAY: Mermail Incident Relay Agent Server`);
  console.log(`======================================================`);
  console.log(`📡 Local Server Running: http://localhost:${PORT}`);
  console.log(`🔒 Human Approval Gate: ACTIVE & ENFORCED`);
  console.log(`💼 Agent Web3 Wallet:   5,000.00 USDC Available`);
  console.log(`📊 Open browser to http://localhost:${PORT} for live UI`);
  console.log(`======================================================\n`);
});

export default app;
