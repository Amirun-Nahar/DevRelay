/**
 * DevRelay: Technical Incident Relay Agent Skill for Mermail
 * Interactive Frontend Controller
 */

let activeIncident = null;
let currentEmail = null;
let currentFixtureName = 'critical_payment_failure.json';

// DOM Elements
const scenarioButtons = document.getElementById('scenarioButtons');
const emailFrom = document.getElementById('emailFrom');
const emailSubject = document.getElementById('emailSubject');
const emailBody = document.getElementById('emailBody');
const emailTimestamp = document.getElementById('emailTimestamp');
const emailTypeBadge = document.getElementById('emailTypeBadge');

// Center Triage Panel
const triageBanner = document.getElementById('triageBanner');
const severityStamp = document.getElementById('severityStamp');
const incidentHeadline = document.getElementById('incidentHeadline');
const incidentSubline = document.getElementById('incidentSubline');
const slaPill = document.getElementById('slaPill');
const approvalStateLabel = document.getElementById('approvalStateLabel');
const extractEndpoint = document.getElementById('extractEndpoint');
const extractErrorCode = document.getElementById('extractErrorCode');
const extractTraceId = document.getElementById('extractTraceId');
const extractEnvironment = document.getElementById('extractEnvironment');
const extractSdk = document.getElementById('extractSdk');
const extractSecurity = document.getElementById('extractSecurity');
const reasoningText = document.getElementById('reasoningText');

// Artefacts Tabs
const customerReplyInput = document.getElementById('customerReplyInput');
const incidentBriefPreview = document.getElementById('incidentBriefPreview');
const escTargetChannel = document.getElementById('escTargetChannel');
const escActionType = document.getElementById('escActionType');
const escRole = document.getElementById('escRole');

// Approval Gate
const operatorNameInput = document.getElementById('operatorNameInput');
const walletPayoutCheckbox = document.getElementById('walletPayoutCheckbox');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');

// Right Dispatch Simulator
const slackChannelTitle = document.getElementById('slackChannelTitle');
const slackMsgTitle = document.getElementById('slackMsgTitle');
const slackFieldSev = document.getElementById('slackFieldSev');
const slackFieldEnv = document.getElementById('slackFieldEnv');
const slackFieldErr = document.getElementById('slackFieldErr');
const slackFieldTrace = document.getElementById('slackFieldTrace');
const slackMsgReasoning = document.getElementById('slackMsgReasoning');
const slackMsgFooter = document.getElementById('slackMsgFooter');
const slackColorBar = document.getElementById('slackColorBar');

const deliveredEmailSubject = document.getElementById('deliveredEmailSubject');
const deliveredEmailBody = document.getElementById('deliveredEmailBody');
const deliveredReceiptTag = document.getElementById('deliveredReceiptTag');
const pagerdutyPayloadView = document.getElementById('pagerdutyPayloadView');
const dispatchStatusBadge = document.getElementById('dispatchStatusBadge');

// Wallet & Audit
const walletBalanceText = document.getElementById('walletBalanceText');
const walletHeroBalance = document.getElementById('walletHeroBalance');
const walletTxList = document.getElementById('walletTxList');
const auditLogList = document.getElementById('auditLogList');
const executionReportCard = document.getElementById('executionReportCard');
const reportExecTime = document.getElementById('reportExecTime');
const repEmail = document.getElementById('repEmail');
const repSlack = document.getElementById('repSlack');
const repPd = document.getElementById('repPd');
const repWallet = document.getElementById('repWallet');
const reportLogsScroll = document.getElementById('reportLogsScroll');

// Modal Elements
const customEmailModal = document.getElementById('customEmailModal');
const customEmailModalBtn = document.getElementById('customEmailModalBtn');
const closeCustomModalBtn = document.getElementById('closeCustomModalBtn');
const cancelCustomModalBtn = document.getElementById('cancelCustomModalBtn');
const submitCustomEmailBtn = document.getElementById('submitCustomEmailBtn');
const customFromInput = document.getElementById('customFromInput');
const customSubjectInput = document.getElementById('customSubjectInput');
const customBodyInput = document.getElementById('customBodyInput');

// 1. Initial Load & Setup
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupDispatchTabs();
  setupEventListeners();
  await loadFixtures();
  await loadWalletStatus();
  await refreshAuditLogs();

  // Ingest default benchmark
  await ingestFixture('critical_payment_failure.json');
});

// Setup Artefacts Tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// Setup Dispatch Simulator Tabs
function setupDispatchTabs() {
  const dtabBtns = document.querySelectorAll('.dispatch-tab');
  dtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dtabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dispatch-content-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-dtab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

function setupEventListeners() {
  approveBtn.addEventListener('click', handleApprove);
  rejectBtn.addEventListener('click', handleReject);
  document.getElementById('reanalyzeBtn').addEventListener('click', () => {
    if (currentEmail) {
      ingestEmailPayload(currentEmail);
    } else {
      ingestFixture(currentFixtureName);
    }
  });

  document.getElementById('copyBriefBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(incidentBriefPreview.textContent);
    const originalText = document.getElementById('copyBriefBtn').textContent;
    document.getElementById('copyBriefBtn').textContent = '✓ Copied!';
    setTimeout(() => {
      document.getElementById('copyBriefBtn').textContent = originalText;
    }, 2000);
  });

  document.getElementById('resetReplyBtn').addEventListener('click', () => {
    if (activeIncident) {
      customerReplyInput.value = activeIncident.customer_reply_draft;
    }
  });

  // Modal open/close
  customEmailModalBtn.addEventListener('click', () => {
    customEmailModal.style.display = 'flex';
  });
  closeCustomModalBtn.addEventListener('click', () => {
    customEmailModal.style.display = 'none';
  });
  cancelCustomModalBtn.addEventListener('click', () => {
    customEmailModal.style.display = 'none';
  });

  submitCustomEmailBtn.addEventListener('click', async () => {
    const customEmail = {
      id: `custom_${Date.now()}`,
      from: customFromInput.value,
      to: 'support@mermail.com',
      subject: customSubjectInput.value,
      body: customBodyInput.value,
      timestamp: new Date().toISOString()
    };
    customEmailModal.style.display = 'none';
    await ingestEmailPayload(customEmail);
  });

  // Periodically refresh audit logs
  setInterval(refreshAuditLogs, 5000);
}

// 2. Load Fixture Presets List
async function loadFixtures() {
  try {
    const res = await fetch('/api/fixtures');
    const fixtures = await res.json();
    document.getElementById('fixtureCount').textContent = `${fixtures.length} Fixtures`;

    scenarioButtons.innerHTML = '';
    fixtures.forEach(fix => {
      const btn = document.createElement('button');
      btn.className = 'scenario-btn';
      if (fix.filename === currentFixtureName) btn.classList.add('active');

      let sevClass = 'sev-P1';
      let sevLabel = 'P1';
      if (fix.filename.includes('p0')) { sevClass = 'sev-P0'; sevLabel = 'P0'; }
      else if (fix.filename.includes('p2')) { sevClass = 'sev-P2'; sevLabel = 'P2'; }
      else if (fix.filename.includes('p3')) { sevClass = 'sev-P3'; sevLabel = 'P3'; }
      else if (fix.filename.includes('billing')) { sevClass = 'sev-IGN'; sevLabel = 'IGN'; }
      else if (fix.filename.includes('injection')) { sevClass = 'sev-P1'; sevLabel = 'SEC'; }
      else if (fix.filename.includes('vague')) { sevClass = 'sev-P2'; sevLabel = 'CTX'; }

      btn.innerHTML = `
        <div class="scenario-btn-left">
          <span class="scenario-badge-sev ${sevClass}">${sevLabel}</span>
          <span class="scenario-name" title="${fix.subject}">${fix.subject}</span>
        </div>
        <span style="font-size: 0.7rem; color: var(--text-muted);">›</span>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ingestFixture(fix.filename);
      });

      scenarioButtons.appendChild(btn);
    });
  } catch (err) {
    console.error('Error loading fixtures:', err);
  }
}

// 3. Ingest a fixture by filename
async function ingestFixture(filename) {
  currentFixtureName = filename;
  try {
    const fixRes = await fetch(`/api/fixtures/${filename}`);
    currentEmail = await fixRes.json();
    updateEmailInspector(currentEmail);

    const ingestRes = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixture: filename })
    });
    const result = await ingestRes.json();
    renderAnalysisResult(result);
    await refreshAuditLogs();
  } catch (err) {
    console.error('Ingest error:', err);
  }
}

// Ingest custom email payload
async function ingestEmailPayload(email) {
  currentEmail = email;
  updateEmailInspector(email);
  try {
    const ingestRes = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await ingestRes.json();
    renderAnalysisResult(result);
    await refreshAuditLogs();
  } catch (err) {
    console.error('Ingest error:', err);
  }
}

function updateEmailInspector(email) {
  emailFrom.textContent = email.from;
  emailSubject.textContent = email.subject;
  emailBody.textContent = email.body;
  emailTimestamp.textContent = new Date(email.timestamp).toLocaleTimeString();
}

// 4. Render DevRelay Analysis Result
function renderAnalysisResult(result) {
  executionReportCard.style.display = 'none';

  if (!result.is_incident) {
    // Non-Technical Email (Ignored)
    activeIncident = null;
    emailTypeBadge.textContent = 'Non-Technical (Ignored)';
    severityStamp.textContent = 'IGN';
    severityStamp.style.background = 'linear-gradient(135deg, #64748b 0%, #334155 100%)';
    triageBanner.style.boxShadow = 'none';
    incidentHeadline.textContent = 'Non-Technical Inquiry Filtered';
    incidentSubline.textContent = `Source: ${result.customer_email} • Triage Status: Discarded`;
    slaPill.textContent = 'No SLA Required';
    slaPill.style.background = 'rgba(148, 163, 184, 0.15)';
    slaPill.style.color = '#cbd5e1';

    approvalStateLabel.textContent = 'IGNORED';
    approvalStateLabel.className = 'gate-state rejected';

    extractEndpoint.textContent = 'None (Non-Technical)';
    extractErrorCode.textContent = 'None';
    extractTraceId.textContent = 'None';
    extractEnvironment.textContent = 'N/A';
    extractSdk.textContent = 'N/A';
    extractSecurity.textContent = 'Zero Risk';

    reasoningText.textContent = result.reason;
    customerReplyInput.value = 'Email filtered by DevRelay dual-filter engine. No automated response drafted for sales/billing general inquiries.';
    incidentBriefPreview.textContent = '# No Incident Brief Generated\nEmail categorized as non-technical sales/billing/marketing query.';

    escTargetChannel.textContent = '#sales-billing';
    escActionType.textContent = 'NONE';
    escRole.textContent = 'Accounts Specialist';

    approveBtn.disabled = true;
    rejectBtn.disabled = true;
    dispatchStatusBadge.textContent = 'Filtered';
    dispatchStatusBadge.className = 'badge badge-subtle';
    return;
  }

  // Legitimate Incident
  activeIncident = result;
  approveBtn.disabled = false;
  rejectBtn.disabled = false;

  emailTypeBadge.textContent = `Technical Incident (${result.severity})`;
  severityStamp.textContent = result.severity;

  // Set colors based on severity
  if (result.severity === 'P0') {
    severityStamp.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
    triageBanner.style.setProperty('--p1-color', '#ef4444');
    slackColorBar.style.background = '#ef4444';
  } else if (result.severity === 'P1') {
    severityStamp.style.background = 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)';
    triageBanner.style.setProperty('--p1-color', '#f97316');
    slackColorBar.style.background = '#f97316';
  } else if (result.severity === 'P2') {
    severityStamp.style.background = 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)';
    triageBanner.style.setProperty('--p1-color', '#f59e0b');
    slackColorBar.style.background = '#f59e0b';
  } else {
    severityStamp.style.background = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
    triageBanner.style.setProperty('--p1-color', '#10b981');
    slackColorBar.style.background = '#10b981';
  }

  incidentHeadline.textContent = result.extracted_data.affected_endpoint 
    ? `Failure: ${result.extracted_data.affected_endpoint}`
    : result.subject;
  incidentSubline.textContent = `Ticket ID: ${result.incident_id} • Reported By: ${result.customer_email}`;

  slaPill.textContent = `⏱️ SLA: ${result.sla_window}`;
  slaPill.style.background = 'rgba(234, 179, 8, 0.15)';
  slaPill.style.color = '#fef08a';

  approvalStateLabel.textContent = result.approval_status === 'APPROVED' ? 'APPROVED & DISPATCHED' : 'PENDING APPROVAL';
  approvalStateLabel.className = result.approval_status === 'APPROVED' ? 'gate-state approved' : 'gate-state pending';

  // Metrics
  extractEndpoint.textContent = result.extracted_data.affected_endpoint || 'Not Specified';
  extractErrorCode.textContent = result.extracted_data.error_code || 'Unspecified Error';
  extractTraceId.textContent = result.extracted_data.trace_id || 'Not Provided';
  extractEnvironment.textContent = result.extracted_data.environment;
  extractSdk.textContent = result.extracted_data.sdk_version || 'None';

  if (result.extracted_data.sanitized_secrets_detected && result.extracted_data.sanitized_secrets_detected.length > 0) {
    extractSecurity.textContent = `Scrubbed: ${result.extracted_data.sanitized_secrets_detected.join(', ')}`;
    extractSecurity.className = 'metric-card-value text-accent';
  } else {
    extractSecurity.textContent = 'Active • 0 Leaks';
    extractSecurity.className = 'metric-card-value text-success';
  }

  // Evidence reasoning
  reasoningText.textContent = result.reasoning;

  // Artefacts
  customerReplyInput.value = result.customer_reply_draft;
  incidentBriefPreview.textContent = result.incident_brief;

  if (result.escalation_recommendation) {
    escTargetChannel.textContent = result.escalation_recommendation.target_channel;
    escActionType.textContent = result.escalation_recommendation.action_type;
    escRole.textContent = result.escalation_recommendation.recommended_role;
  }

  // Previews
  slackChannelTitle.textContent = result.escalation_recommendation?.target_channel.replace('#', '') || 'eng-oncall';
  slackMsgTitle.textContent = `${result.severity === 'P0' ? '🚨' : result.severity === 'P1' ? '⚠️' : 'ℹ️'} [DevRelay] ${result.severity} Incident: ${result.extracted_data.affected_endpoint || 'Service Issue'}`;
  slackFieldSev.textContent = `${result.severity} (${result.sla_window} SLA)`;
  slackFieldEnv.textContent = result.extracted_data.environment;
  slackFieldErr.textContent = result.extracted_data.error_code || 'Unknown Error';
  slackFieldTrace.textContent = result.extracted_data.trace_id || 'N/A';
  slackMsgReasoning.textContent = result.reasoning;
  slackMsgFooter.textContent = `Ticket ID: ${result.incident_id} • Awaiting Operator Authorization`;

  deliveredEmailSubject.textContent = `Re: ${result.subject} [${result.incident_id}]`;
  deliveredEmailBody.textContent = result.customer_reply_draft;
  deliveredReceiptTag.textContent = 'Status: Staged for Operator Approval (Not Sent Yet)';
  deliveredReceiptTag.style.color = '#f59e0b';

  // PagerDuty / GitHub Preview
  const pdMock = {
    event_action: 'trigger',
    dedup_key: `devrelay-${result.incident_id}`,
    severity: result.severity === 'P0' ? 'critical' : result.severity === 'P1' ? 'error' : 'warning',
    summary: `[${result.severity}] ${result.extracted_data.affected_endpoint} - ${result.extracted_data.error_code}`,
    sla_response_deadline: result.sla_window,
    target_channel: result.escalation_recommendation?.target_channel
  };
  pagerdutyPayloadView.textContent = JSON.stringify(pdMock, null, 2);

  dispatchStatusBadge.textContent = 'Awaiting Gate';
  dispatchStatusBadge.className = 'badge badge-accent';
}

// 5. Execute Human Approval Gate
async function handleApprove() {
  if (!activeIncident) return;

  const operatorName = operatorNameInput.value.trim() || 'Alex SRE';
  const editedReply = customerReplyInput.value;
  const enableWallet = walletPayoutCheckbox.checked && activeIncident.severity === 'P0';

  approveBtn.disabled = true;
  approveBtn.textContent = '⏳ Dispatching...';

  try {
    const res = await fetch(`/api/incidents/${activeIncident.incident_id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorName,
        editedCustomerReply: editedReply,
        enableWalletPayout: enableWallet,
        walletAmount: 250.0
      })
    });
    const data = await res.json();

    if (data.success) {
      activeIncident = data.incident;
      const report = data.report;

      // Update Gate State
      approvalStateLabel.textContent = 'APPROVED & DISPATCHED';
      approvalStateLabel.className = 'gate-state approved';

      dispatchStatusBadge.textContent = 'Dispatched (Live)';
      dispatchStatusBadge.className = 'badge badge-success';

      slackMsgFooter.textContent = `Ticket ID: ${activeIncident.incident_id} • Authorized by ${operatorName}`;
      deliveredReceiptTag.textContent = `Receipt: ${report.customer_receipt_id} • Delivered via Mermail API`;
      deliveredReceiptTag.style.color = '#10b981';

      // Render Execution Report
      executionReportCard.style.display = 'flex';
      reportExecTime.textContent = `Executed at ${new Date(report.executed_at).toLocaleTimeString()}`;
      repEmail.textContent = report.email_sent ? 'Sent' : 'Failed';
      repSlack.textContent = report.slack_delivered ? 'Delivered' : 'Skipped';
      repPd.textContent = report.pagerduty_triggered ? 'Paged' : 'Skipped';
      repWallet.textContent = report.wallet_payout?.status === 'DISPATCHED' 
        ? `${report.wallet_payout.amount_usdc} USDC` 
        : 'Skipped';

      reportLogsScroll.innerHTML = report.delivery_logs.map(log => `
        <div style="padding: 2px 0;">
          <span style="color: ${log.status === 'SUCCESS' ? '#34d399' : '#f87171'}; font-weight: 700;">[${log.status}]</span>
          <strong>${log.step}</strong>: ${log.details}
        </div>
      `).join('');

      await loadWalletStatus();
      await refreshAuditLogs();

      approveBtn.textContent = '✓ Actions Dispatched!';
      setTimeout(() => {
        approveBtn.textContent = '✓ Approved & Dispatched';
      }, 2500);
    }
  } catch (err) {
    console.error('Approval execution error:', err);
    approveBtn.disabled = false;
    approveBtn.textContent = 'Approve & Dispatch Actions';
  }
}

// 6. Handle Rejection
async function handleReject() {
  if (!activeIncident) return;
  const reason = prompt('Please specify rejection or cancellation reason:', 'False positive / Handled out of band');
  if (!reason) return;

  try {
    const res = await fetch(`/api/incidents/${activeIncident.incident_id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.success) {
      activeIncident = data.incident;
      approvalStateLabel.textContent = 'REJECTED / CANCELLED';
      approvalStateLabel.className = 'gate-state rejected';
      dispatchStatusBadge.textContent = 'Cancelled';
      dispatchStatusBadge.className = 'badge badge-subtle';
      await refreshAuditLogs();
    }
  } catch (err) {
    console.error('Rejection error:', err);
  }
}

// 7. Load Wallet Status
async function loadWalletStatus() {
  try {
    const res = await fetch('/api/wallet/status');
    const data = await res.json();
    const formatted = `${data.balance_usdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`;
    walletBalanceText.textContent = formatted;
    walletHeroBalance.textContent = formatted;

    walletTxList.innerHTML = '';
    if (data.transactions && data.transactions.length > 0) {
      data.transactions.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
          <div class="tx-item-header">
            <span>${tx.type === 'SLA_BREACH_CREDIT' ? '⚡ SLA Breach Guarantee' : '🎯 Bug Bounty Micro-Reward'}</span>
            <span class="tx-item-amount">+${tx.amount_usdc} USDC</span>
          </div>
          <div class="tx-item-hash">Tx: ${tx.tx_hash.substring(0, 16)}... | Block #${tx.block_number}</div>
          <div style="font-size: 0.68rem; color: var(--text-muted);">${new Date(tx.timestamp).toLocaleTimeString()} • ${tx.network}</div>
        `;
        walletTxList.appendChild(item);
      });
    } else {
      walletTxList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.76rem;">No autonomous micro-refunds dispatched yet.</div>';
    }
  } catch (err) {
    console.error('Wallet load error:', err);
  }
}

// 8. Refresh Audit Logs
async function refreshAuditLogs() {
  try {
    const res = await fetch('/api/audit-logs');
    const logs = await res.json();
    auditLogList.innerHTML = logs.slice(0, 20).map(log => `
      <div class="audit-item">
        <span class="audit-tag">${log.type}</span>
        <span class="audit-msg">${log.message}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Audit log refresh error:', err);
  }
}
