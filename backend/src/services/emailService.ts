import nodemailer from 'nodemailer';
import { db } from '../models/database';

interface GoodsRequestItem {
  item_name_snapshot?: string;
  name?: string;
  requested_quantity: number;
  unit_snapshot?: string;
  unit?: string;
  item_description?: string;
}

interface GoodsRequestEmailPayload {
  requestNumber: string;
  branchName: string;
  priority: string;
  requiredBy?: string | null;
  remarks?: string | null;
  requestedByName: string;
  requestedByPhone?: string | null;
  requestedByEmail?: string | null;
  items: GoodsRequestItem[];
}

interface NocIncidentEmailPayload {
  incidentId: string;
  title: string;
  issueType: string;
  priority: string;
  branchName?: string | null;
  popLocation?: string | null;
  affectedServices?: string | null;
  affectedCustomersCount?: number;
  complainByName: string;
  description: string;
  estimatedResolutionTime?: string | null;
  impactDetails?: string | null;
}

/**
 * Creates and returns a Nodemailer transporter.
 * Returns null if SMTP configuration is incomplete.
 */
export const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'webmail.fiberworld.net.np';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false' && (port === 465 || process.env.SMTP_SECURE === 'true');
  const user = process.env.SMTP_USER || 'software@fiberworld.net.np';
  const pass = process.env.SMTP_PASS || 'Nepal@123';

  if (!pass) {
    console.warn('[EmailService] SMTP_PASS is not configured. Email dispatch skipped.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const getFromAddress = () => {
  const from = (process.env.EMAIL_FROM || 'software@fiberworld.net.np').trim();
  if (from.includes('<')) return from;
  return `"FWCPL Operations Platform" <${from}>`;
};

const getPortalBaseUrl = () => {
  return (process.env.PORTAL_BASE_URL || 'http://103.166.172.36').replace(/\/+$/, '');
};

/**
 * Resolves email recipients for Operations (Goods Requisitions).
 */
export const getOperationRecipients = async (): Promise<string[]> => {
  const recipients = new Set<string>();

  // 1. Explicit configured address from .env or default to operation@fiberworld.net.np
  const opEmails = process.env.OPERATION_ALERT_EMAIL || 'operation@fiberworld.net.np';
  opEmails.split(',')
    .map(e => e.trim())
    .filter(Boolean)
    .forEach(e => recipients.add(e));

  // 2. Query users with department = 'OPS' or role = 'SUPER_ADMIN' / 'MANAGEMENT'
  try {
    const res = await db.query(`
      SELECT DISTINCT u.email
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'Active'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND (
          d.code IN ('OPS', 'EXEC')
          OR u.role IN ('SUPER_ADMIN', 'MANAGEMENT', 'OPERATION_MANAGER')
        )
    `);

    for (const row of res.rows) {
      if (row.email && row.email.includes('@')) {
        recipients.add(row.email.trim());
      }
    }
  } catch (err: any) {
    console.warn('[EmailService] Error fetching operation recipient emails:', err.message);
  }

  return Array.from(recipients);
};

/**
 * Resolves email recipients for NOC (Incident Escalations).
 */
export const getNocRecipients = async (): Promise<string[]> => {
  const recipients = new Set<string>();

  // 1. Explicit configured address from .env or default to noc@fiberworld.net.np
  const nocEmails = process.env.NOC_ALERT_EMAIL || 'noc@fiberworld.net.np';
  nocEmails.split(',')
    .map(e => e.trim())
    .filter(Boolean)
    .forEach(e => recipients.add(e));

  // 2. Query users in NOC / Technical support
  try {
    const res = await db.query(`
      SELECT DISTINCT u.email
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'Active'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND (
          d.code IN ('NOC', 'SUPPORT', 'TECH')
          OR u.role IN ('NOC_ENGINEER', 'NOC_MANAGER', 'SUPER_ADMIN')
        )
    `);

    for (const row of res.rows) {
      if (row.email && row.email.includes('@')) {
        recipients.add(row.email.trim());
      }
    }
  } catch (err: any) {
    console.warn('[EmailService] Error fetching NOC recipient emails:', err.message);
  }

  return Array.from(recipients);
};

/**
 * Sends an email notification to Operation when a branch submits a goods request.
 */
export const sendGoodsRequestEmail = async (payload: GoodsRequestEmailPayload): Promise<void> => {
  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const recipients = await getOperationRecipients();
    if (recipients.length === 0) {
      console.warn('[EmailService] No recipient emails found for Operation goods request alert.');
      return;
    }

    const portalUrl = `${getPortalBaseUrl()}/goods-requests`;
    const priorityColor =
      payload.priority === 'Critical'
        ? '#dc2626'
        : payload.priority === 'Urgent'
        ? '#ea580c'
        : '#2563eb';

    const itemsRows = payload.items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${it.item_name_snapshot || it.name || 'Item'}</td>
          <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; text-align: center;">${it.requested_quantity} ${it.unit_snapshot || it.unit || 'PCS'}</td>
          <td style="padding: 10px 14px; color: #64748b; font-size: 13px;">${it.item_description || '—'}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; }
          .container { max-width: 650px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 24px 30px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 28px 30px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #ffffff; background-color: ${priorityColor}; }
          .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0; }
          .info-grid { display: table; width: 100%; }
          .info-row { display: table-row; }
          .info-label { display: table-cell; padding: 5px 12px 5px 0; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; }
          .info-value { display: table-cell; padding: 5px 0; font-size: 13px; color: #0f172a; font-weight: 700; }
          table.items-table { width: 100%; border-collapse: collapse; margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          table.items-table th { background-color: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
          .btn-container { text-align: center; margin-top: 28px; }
          .btn { background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.3); }
          .footer { background-color: #f8fafc; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 New Branch Goods Requisition</h1>
            <p>Fiber World Operations System — Material Dispatch Alert</p>
          </div>
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span style="font-size: 18px; font-weight: 800; color: #0f172a;">Requisition: ${payload.requestNumber}</span>
              <span class="badge">${payload.priority} Priority</span>
            </div>

            <div class="card">
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-label">Requesting Branch:</div>
                  <div class="info-value">${payload.branchName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Submitted By:</div>
                  <div class="info-value">${payload.requestedByName} ${payload.requestedByPhone ? `(${payload.requestedByPhone})` : ''}</div>
                </div>
                ${payload.requiredBy ? `
                <div class="info-row">
                  <div class="info-label">Required By Date:</div>
                  <div class="info-value">${payload.requiredBy}</div>
                </div>` : ''}
                ${payload.remarks ? `
                <div class="info-row">
                  <div class="info-label">Branch Remarks:</div>
                  <div class="info-value" style="font-weight: 500; color: #475569;">${payload.remarks}</div>
                </div>` : ''}
              </div>
            </div>

            <h3 style="margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #334155; letter-spacing: 0.5px;">Requested Items (${payload.items.length})</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style="text-align: center;">Qty</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="btn-container">
              <a href="${portalUrl}" class="btn" target="_blank">Review & Process Requisition →</a>
            </div>
          </div>
          <div class="footer">
            This is an automated notification from Fiber World Operations Portal.<br/>
            Please do not reply directly to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: getFromAddress(),
      to: recipients.join(', '),
      subject: `[Goods Request] ${payload.branchName} requested ${payload.items.length} item(s) (${payload.requestNumber}) - ${payload.priority}`,
      html: htmlContent,
    });

    console.log(`[EmailService] Goods request email sent to: ${recipients.join(', ')} for ${payload.requestNumber}`);
  } catch (err: any) {
    console.error('[EmailService] Failed to send goods request email:', err.message);
  }
};

/**
 * Sends an email notification to NOC when Operation raises an incident.
 */
export const sendNocIncidentEmail = async (payload: NocIncidentEmailPayload): Promise<void> => {
  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const recipients = await getNocRecipients();
    if (recipients.length === 0) {
      console.warn('[EmailService] No recipient emails found for NOC incident alert.');
      return;
    }

    const portalUrl = `${getPortalBaseUrl()}/noc`;
    const priorityColor =
      payload.priority === 'P1'
        ? '#dc2626'
        : payload.priority === 'P2'
        ? '#ea580c'
        : '#2563eb';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; }
          .container { max-width: 650px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); color: #ffffff; padding: 24px 30px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 28px 30px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #ffffff; background-color: ${priorityColor}; }
          .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0; }
          .info-grid { display: table; width: 100%; }
          .info-row { display: table-row; }
          .info-label { display: table-cell; padding: 5px 12px 5px 0; font-size: 13px; color: #64748b; font-weight: 600; width: 150px; }
          .info-value { display: table-cell; padding: 5px 0; font-size: 13px; color: #0f172a; font-weight: 700; }
          .desc-box { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 14px; border-radius: 0 6px 6px 0; margin-top: 16px; font-size: 13px; line-height: 1.5; color: #7c2d12; }
          .btn-container { text-align: center; margin-top: 28px; }
          .btn { background-color: #dc2626; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(220,38,38,0.3); }
          .footer { background-color: #f8fafc; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Network Incident Escalated to NOC</h1>
            <p>Fiber World Operations — Critical Network Alert</p>
          </div>
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span style="font-size: 18px; font-weight: 800; color: #0f172a;">${payload.incidentId}: ${payload.title}</span>
              <span class="badge">${payload.priority} Priority</span>
            </div>

            <div class="card">
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-label">Issue Classification:</div>
                  <div class="info-value">${payload.issueType}</div>
                </div>
                ${payload.branchName ? `
                <div class="info-row">
                  <div class="info-label">Affected Branch:</div>
                  <div class="info-value">${payload.branchName}</div>
                </div>` : ''}
                ${payload.popLocation ? `
                <div class="info-row">
                  <div class="info-label">POP / Node Location:</div>
                  <div class="info-value">${payload.popLocation}</div>
                </div>` : ''}
                ${payload.affectedServices ? `
                <div class="info-row">
                  <div class="info-label">Affected Services:</div>
                  <div class="info-value">${payload.affectedServices}</div>
                </div>` : ''}
                ${payload.affectedCustomersCount ? `
                <div class="info-row">
                  <div class="info-label">Affected Customers:</div>
                  <div class="info-value" style="color: #dc2626;">~${payload.affectedCustomersCount} Users</div>
                </div>` : ''}
                <div class="info-row">
                  <div class="info-label">Escalated By:</div>
                  <div class="info-value">${payload.complainByName}</div>
                </div>
                ${payload.estimatedResolutionTime ? `
                <div class="info-row">
                  <div class="info-label">Estimated ETR:</div>
                  <div class="info-value">${payload.estimatedResolutionTime}</div>
                </div>` : ''}
              </div>
            </div>

            <div class="desc-box">
              <strong style="display: block; margin-bottom: 4px;">Incident Description & Initial Diagnostics:</strong>
              ${payload.description.replace(/\n/g, '<br/>')}
            </div>

            ${payload.impactDetails ? `
            <div style="margin-top: 14px; font-size: 13px; color: #475569;">
              <strong>Impact Details:</strong> ${payload.impactDetails}
            </div>` : ''}

            <div class="btn-container">
              <a href="${portalUrl}" class="btn" target="_blank">Open Incident in NOC Portal →</a>
            </div>
          </div>
          <div class="footer">
            This is an urgent operational dispatch from Fiber World Operations Platform.<br/>
            NOC Engineers on duty are requested to acknowledge and begin diagnostics immediately.
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: getFromAddress(),
      to: recipients.join(', '),
      subject: `[NOC Alert - ${payload.priority}] ${payload.title} (${payload.incidentId}) - ${payload.issueType}`,
      html: htmlContent,
    });

    console.log(`[EmailService] NOC incident email sent to: ${recipients.join(', ')} for ${payload.incidentId}`);
  } catch (err: any) {
    console.error('[EmailService] Failed to send NOC incident email:', err.message);
  }
};
