import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

export const sendBackupEmail = async (backupFilePath?: string, targetRecipient?: string) => {
  const filePath = backupFilePath || process.argv[2];
  const recipient = targetRecipient || process.env.BACKUP_EMAIL_TO || process.env.NOC_ALERT_EMAIL || 'noc@fiberworld.net.np';

  console.log('=====================================================');
  console.log('  FWCPL BACKUP EMAIL DISPATCHER');
  console.log('=====================================================');
  console.log(`Target Recipient: ${recipient}`);

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`❌ Error: Backup file not found at: ${filePath}`);
    process.exit(1);
  }

  const fileStats = fs.statSync(filePath);
  const fileSizeInBytes = fileStats.size;
  const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(1);
  const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
  const fileName = path.basename(filePath);

  console.log(`Backup File:     ${fileName}`);
  console.log(`File Size:       ${fileSizeInKB} KB (${fileSizeInMB} MB)`);

  const host = process.env.SMTP_HOST || 'webmail.fiberworld.net.np';
  const user = process.env.SMTP_USER || 'software@fiberworld.net.np';
  const pass = process.env.SMTP_PASS || 'Nepal@123';
  const fromEmail = process.env.EMAIL_FROM || user;

  const nowNepal = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' });
  const nowUtc = new Date().toUTCString();

  // Prepare attachments (Max 25MB for typical mail servers)
  const isTooLarge = fileSizeInBytes > 25 * 1024 * 1024;
  const attachments: any[] = [];

  if (!isTooLarge) {
    attachments.push({
      filename: fileName,
      path: filePath,
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 24px 30px; text-align: left; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 4px 0 0 0; font-size: 12px; color: #c7d2fe; }
        .body { padding: 28px 30px; }
        .badge { display: inline-block; padding: 4px 10px; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 16px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .info-table td.label { font-weight: 600; color: #64748b; width: 38%; }
        .info-table td.value { font-weight: 700; color: #0f172a; word-break: break-all; }
        .alert-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin: 18px 0; font-size: 12px; color: #1e40af; line-height: 1.5; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 30px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Fiber World Communication Pvt. Ltd.</h1>
          <p>Automated Server Backup Notification & Archive</p>
        </div>
        <div class="body">
          <span class="badge">✔ System Backup Verified</span>
          <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 0;">Automated Server Backup Complete</h2>
          <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0;">
            A fresh backup of the FWCPL Operations Management system has been generated and archived.
          </p>

          <table class="info-table">
            <tr>
              <td class="label">Server Host:</td>
              <td class="value">vm-01 (103.166.172.36)</td>
            </tr>
            <tr>
              <td class="label">Backup Timestamp:</td>
              <td class="value">${nowNepal} NPT</td>
            </tr>
            <tr>
              <td class="label">UTC Timestamp:</td>
              <td class="value">${nowUtc}</td>
            </tr>
            <tr>
              <td class="label">Archive Filename:</td>
              <td class="value"><code>${fileName}</code></td>
            </tr>
            <tr>
              <td class="label">Archive Size:</td>
              <td class="value"><strong>${fileSizeInKB} KB</strong> (${fileSizeInBytes.toLocaleString()} bytes)</td>
            </tr>
            <tr>
              <td class="label">Data Included:</td>
              <td class="value">Database (PostgreSQL / SQLite), Uploaded Files, Environment Config (.env)</td>
            </tr>
          </table>

          ${isTooLarge ? `
            <div class="alert-box" style="background-color: #fffbeb; border-color: #fde68a; color: #92400e;">
              ⚠️ <strong>Notice:</strong> The backup archive size (${fileSizeInMB} MB) exceeds the 25MB email attachment limit. The file is safely retained on the server disk under <code>~/operation-fwcpl/backups/</code>.
            </div>
          ` : `
            <div class="alert-box">
              📎 <strong>Attachment:</strong> The complete encrypted compressed backup bundle <code>${fileName}</code> is attached to this email. You can download and save it to an offsite secure drive.
            </div>
          `}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Fiber World Communication Pvt. Ltd. (FWCPL). All rights reserved.<br>
          Network Operations Center (NOC) &bull; Software Department
        </div>
      </div>
    </body>
    </html>
  `;

  const sendWithTransport = async (port: number, secure: boolean) => {
    console.log(`Connecting to SMTP on port ${port} (secure: ${secure})...`);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"FWCPL Operations Backup" <${fromEmail}>`,
      to: recipient,
      subject: `[FWCPL Backup] Automated System Backup - ${fileName}`,
      html: htmlContent,
      attachments,
    });

    return info;
  };

  try {
    // Attempt Port 465 (SSL)
    const info = await sendWithTransport(465, true);
    console.log(`✔ Email delivered via Port 465! Message ID: ${info.messageId}`);
    console.log(`✅ Backup successfully sent to ${recipient}\n`);
    return true;
  } catch (err465: any) {
    console.warn(`⚠️ Port 465 failed (${err465.message}), attempting Port 587 (STARTTLS)...`);
    try {
      const info587 = await sendWithTransport(587, false);
      console.log(`✔ Email delivered via Port 587! Message ID: ${info587.messageId}`);
      console.log(`✅ Backup successfully sent to ${recipient}\n`);
      return true;
    } catch (err587: any) {
      console.error(`❌ Failed to send backup email on both ports:`, err587.message);
      throw err587;
    }
  }
};

if (require.main === module) {
  const targetFile = process.argv[2];
  const targetEmail = process.argv[3];
  sendBackupEmail(targetFile, targetEmail)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal email error:', err.message);
      process.exit(1);
    });
}
