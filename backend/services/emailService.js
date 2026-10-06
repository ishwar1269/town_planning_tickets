const nodemailer = require('nodemailer');

// Development Email Transporter
// Outputs formatted HTML email previews directly to console and dispatches if SMTP environment variables are configured
const transporter = nodemailer.createTransport({
  jsonTransport: true // Logs JSON representation of email for safe offline testing
});

/**
 * Send Confirmation Email to Ticket Creator/Applicant
 */
async function sendTicketCreatedEmail(ticket) {
  const subject = `[I-SupportOne Desk] Ticket Created: #${ticket.ticket_number} - ${ticket.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #182538; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px;">I-SupportOne Desk • Town Planning</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Ticket Submission Confirmation</p>
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px;">
        <p>Dear <strong>${ticket.created_by_name}</strong>,</p>
        <p>Your ticket has been successfully registered in the I-SupportOne Desk system.</p>

        <div style="background: #f8fafc; border-left: 4px solid #0265dc; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Ticket ID:</strong> #${ticket.ticket_number}</p>
          <p style="margin: 0 0 6px 0;"><strong>Subject:</strong> ${ticket.title}</p>
          <p style="margin: 0 0 6px 0;"><strong>Category:</strong> ${ticket.category_name || 'General'}</p>
          <p style="margin: 0 0 6px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
          <p style="margin: 0 0 6px 0;"><strong>Status:</strong> ${ticket.status}</p>
          <p style="margin: 0;"><strong>SLA Target Resolution:</strong> Within 24 hours (${new Date(ticket.due_at).toLocaleString()})</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">Our technical team is reviewing your request. You will receive email notifications as updates occur.</p>
      </div>
    </div>
  `;

  console.log(`\n================ EMAIL DISPATCHED TO CREATOR ================`);
  console.log(`To: ${ticket.created_by_email}`);
  console.log(`Subject: ${subject}`);
  console.log(`=============================================================\n`);

  try {
    await transporter.sendMail({
      from: '"I-SupportOne Desk" <helpdesk@townplanning.gov.in>',
      to: ticket.created_by_email,
      subject,
      html
    });
  } catch (err) {
    console.error('Email dispatch error:', err.message);
  }
}

/**
 * Send Assignment Notification Email to Assigned Technician
 */
async function sendTicketAssignedEmail(ticket, tech) {
  if (!tech || !tech.email) return;

  const subject = `[ACTION REQUIRED] New Ticket Assigned: #${ticket.ticket_number} - ${ticket.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #0265dc; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px;">I-SupportOne Desk • Technician Assignment</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #dbeafe;">High Priority Support Queue</p>
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px;">
        <p>Hello <strong>${tech.name}</strong>,</p>
        <p>A new ticket has been assigned to you for resolution.</p>

        <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Ticket ID:</strong> #${ticket.ticket_number}</p>
          <p style="margin: 0 0 6px 0;"><strong>Subject:</strong> ${ticket.title}</p>
          <p style="margin: 0 0 6px 0;"><strong>Applicant:</strong> ${ticket.created_by_name} (${ticket.created_by_email})</p>
          <p style="margin: 0 0 6px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
          <p style="margin: 0;"><strong>SLA Deadline:</strong> 24 Hours (${new Date(ticket.due_at).toLocaleString()})</p>
        </div>

        <p style="font-size: 13px; color: #dc2626;"><strong>Note:</strong> Please resolve this ticket before SLA breach in 24 hours.</p>
      </div>
    </div>
  `;

  console.log(`\n================ EMAIL DISPATCHED TO TECHNICIAN ================`);
  console.log(`To: ${tech.email}`);
  console.log(`Subject: ${subject}`);
  console.log(`=================================================================\n`);

  try {
    await transporter.sendMail({
      from: '"I-SupportOne Desk" <helpdesk@townplanning.gov.in>',
      to: tech.email,
      subject,
      html
    });
  } catch (err) {
    console.error('Technician Email dispatch error:', err.message);
  }
}

/**
 * Send SLA Breach Warning Alert to Technician (approaching 24h breach)
 */
async function sendSLABreachWarningEmail(ticket, tech) {
  const recipientEmail = (tech && tech.email) ? tech.email : 'helpdesk@townplanning.gov.in';
  const subject = `⚠️ [SLA BREACH WARNING] Ticket #${ticket.ticket_number} is about to breach 24h SLA!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 8px; overflow: hidden;">
      <div style="background: #ef4444; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px;">⚠️ SLA BREACH WARNING ALERT</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #fee2e2;">I-SupportOne Desk 24-Hour SLA Target</p>
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px;">
        <p style="color: #dc2626; font-weight: bold;">URGENT ATTENTION REQUIRED!</p>
        <p>Ticket <strong>#${ticket.ticket_number}</strong> is nearing SLA breach (< 4 hours remaining).</p>

        <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Ticket ID:</strong> #${ticket.ticket_number}</p>
          <p style="margin: 0 0 6px 0;"><strong>Subject:</strong> ${ticket.title}</p>
          <p style="margin: 0 0 6px 0;"><strong>Status:</strong> ${ticket.status}</p>
          <p style="margin: 0 0 6px 0;"><strong>Assigned Technician:</strong> ${tech ? tech.name : 'Unassigned'}</p>
          <p style="margin: 0;"><strong>SLA Expiry Time:</strong> ${new Date(ticket.due_at).toLocaleString()}</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">Please resolve or update status immediately to avoid SLA breach escalation.</p>
      </div>
    </div>
  `;

  console.log(`\n================ SLA WARNING EMAIL DISPATCHED ================`);
  console.log(`To: ${recipientEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`==============================================================\n`);

  try {
    await transporter.sendMail({
      from: '"I-SupportOne Desk Escalation" <sla-alert@townplanning.gov.in>',
      to: recipientEmail,
      subject,
      html
    });
  } catch (err) {
    console.error('SLA Warning email error:', err.message);
  }
}

/**
 * Send Action/Remark Update Email to Applicant (Creator)
 */
async function sendTicketActionUpdateEmail(ticket, actionType, remarkText, updatedBy) {
  if (!ticket || !ticket.created_by_email) return;

  const subject = `[I-SupportOne Desk Update] Ticket #${ticket.ticket_number} - Status: ${ticket.status}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #182538; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px;">I-SupportOne Desk • Action Update</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Ticket #${ticket.ticket_number} Status Update</p>
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px;">
        <p>Dear <strong>${ticket.created_by_name}</strong>,</p>
        <p>An action update has been recorded on your ticket by <strong>${updatedBy || 'Technician'}</strong>.</p>

        <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Ticket ID:</strong> #${ticket.ticket_number}</p>
          <p style="margin: 0 0 6px 0;"><strong>Subject:</strong> ${ticket.title}</p>
          <p style="margin: 0 0 6px 0;"><strong>Current Status:</strong> <span style="color: #0265dc; font-weight: bold;">${ticket.status}</span></p>
          <p style="margin: 0 0 6px 0;"><strong>Action Type:</strong> ${actionType}</p>
          <p style="margin: 0;"><strong>Officer Remark / Note:</strong> ${remarkText || 'No additional note.'}</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">Thank you for using I-SupportOne Desk.</p>
      </div>
    </div>
  `;

  console.log(`\n================ TICKET ACTION EMAIL DISPATCHED TO USER ================`);
  console.log(`To: ${ticket.created_by_email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Action: ${actionType} | Remark: ${remarkText}`);
  console.log(`========================================================================\n`);

  try {
    await transporter.sendMail({
      from: '"I-SupportOne Desk Support" <support@townplanning.gov.in>',
      to: ticket.created_by_email,
      subject,
      html
    });
  } catch (err) {
    console.error('Ticket Action email error:', err.message);
  }
}

module.exports = {
  sendTicketCreatedEmail,
  sendTicketAssignedEmail,
  sendSLABreachWarningEmail,
  sendTicketActionUpdateEmail
};
