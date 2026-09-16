import nodemailer from 'nodemailer';

const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;
const cyan = (t: string) => `\x1b[36m${t}\x1b[0m`;

export const runEmailTest = async () => {
  console.log(bold('\n============================================================='));
  console.log(bold('  TESTING FWCPL SMTP SERVER (webmail.fiberworld.net.np)'));
  console.log(bold('=============================================================\n'));

  const host = process.env.SMTP_HOST || 'webmail.fiberworld.net.np';
  const user = process.env.SMTP_USER || 'software@fiberworld.net.np';
  const pass = process.env.SMTP_PASS || 'Nepal@123';
  const targetEmail = process.env.TEST_EMAIL || 'software@fiberworld.net.np';

  console.log(`SMTP Host: ${cyan(host)}`);
  console.log(`SMTP User: ${cyan(user)}`);
  console.log(`Target Test Recipient: ${cyan(targetEmail)}\n`);

  // 1. Try Port 465 (SSL)
  console.log(bold('Attempt 1: Testing Port 465 with SSL...'));
  try {
    const transporter465 = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });

    await transporter465.verify();
    console.log(`  ${green('✔')} SMTP handshake on Port 465 (SSL) successful!`);

    console.log(bold('\nSending test verification email via Port 465...'));
    const info = await transporter465.sendMail({
      from: `"FWCPL System Test" <${user}>`,
      to: targetEmail,
      subject: 'FWCPL Operations Portal - SMTP Integration Verification Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">FWCPL Operations Portal - Email Integration Successful</h2>
          <p>This is an automated test confirming that your mail server <strong>${host}</strong> is operational.</p>
          <p><strong>Configured Alerts:</strong></p>
          <ul>
            <li>Branch Goods Request &rarr; <code>operation@fiberworld.net.np</code></li>
            <li>NOC Incident Escalation &rarr; <code>noc@fiberworld.net.np</code></li>
          </ul>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log(`  ${green('✔')} Test email delivered! Message ID: ${info.messageId}`);
    console.log(green('\nSMTP SETUP IS 100% OPERATIONAL!\n'));
    return true;
  } catch (err465: any) {
    console.warn(`  ${red('✖')} Port 465 failed: ${err465.message}`);

    // 2. Fallback to Port 587 (STARTTLS)
    console.log(bold('\nAttempt 2: Testing Port 587 with STARTTLS...'));
    try {
      const transporter587 = nodemailer.createTransport({
        host,
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
      });

      await transporter587.verify();
      console.log(`  ${green('✔')} SMTP handshake on Port 587 (STARTTLS) successful!`);

      const info = await transporter587.sendMail({
        from: `"FWCPL System Test" <${user}>`,
        to: targetEmail,
        subject: 'FWCPL Operations Portal - SMTP Integration Verification Test (Port 587)',
        text: 'This is a test confirming that webmail.fiberworld.net.np on Port 587 is operational.',
      });

      console.log(`  ${green('✔')} Test email delivered via Port 587! Message ID: ${info.messageId}`);
      console.log(cyan('\nNOTE: Port 587 succeeded. If Port 465 remains blocked on VM, set SMTP_PORT=587 and SMTP_SECURE=false in .env.\n'));
      return true;
    } catch (err587: any) {
      console.error(`  ${red('✖')} Port 587 failed: ${err587.message}`);
      throw new Error(`SMTP connection failed on both ports 465 and 587.`);
    }
  }
};

if (require.main === module) {
  runEmailTest()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
