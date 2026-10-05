# DevRelay Demo Environment

Welcome to the local interactive demo environment for **DevRelay**.

## Quick Start

1. Ensure dependencies are installed in the project root:
   ```bash
   npm install
   ```

2. Start the local mock Mermail server:
   ```bash
   npm run dev
   ```

3. Open your browser to:
   ```
   http://localhost:3000
   ```

4. Or run the CLI test tool:
   ```bash
   node scripts/send_test_email.js --fixture=critical_payment_failure.json
   node scripts/send_test_email.js --fixture=critical_payment_failure.json --approve
   ```

## Demo Scenarios Included

- **Critical Payment Failure (Prompt Benchmark)**: `examples/sample_emails/critical_payment_failure.json`
- **P0 Catastrophic Outage**: `examples/sample_emails/p0_outage.json`
- **P1 Core Pipeline Failure**: `examples/sample_emails/p1_core_endpoint.json`
- **P2 Staging Rate-Limit (Workaround)**: `examples/sample_emails/p2_medium_workaround.json`
- **P3 SDK Typo / Feature Suggestion**: `examples/sample_emails/p3_feature_request.json`
- **Non-Technical Billing / Sales Inquiry**: `examples/sample_emails/non_technical_billing.json`
- **Prompt Injection Defense Test**: `examples/sample_emails/prompt_injection_attack.json`
- **Missing Technical Context ("It's broken")**: `examples/sample_emails/vague_complaint.json`
