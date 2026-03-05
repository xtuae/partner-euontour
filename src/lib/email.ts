export interface EmailParams {
  to: string;
  subject: string;
  body: string; // Plain text or HTML
}

import { sendEmailBrevo } from './email/brevo.js';

/**
 * Sends an email asynchronously.
 * Uses Brevo if BREVO_API_KEY is allowed, otherwise Mock.
 */
export async function sendEmail(params: EmailParams) {
  if (process.env.BREVO_API_KEY) {
    return sendEmailBrevo(params);
  }

  // Mock Implementation
  console.log(`
      [MOCK EMAIL SERVICE]
      To: ${params.to}
      Subject: ${params.subject}
      -------------------
      ${params.body}
      -------------------
    `);
}

const EMAIL_FOOTER = `
<br/><hr/>
<p style="font-size:12px;color:#777;">
EuOnTour Partners<br/>
This is a system-generated email. Please do not reply.<br/>
If you need help, contact support@euontour.com
</p>
`;

export const EMAIL_TEMPLATES = {
  // 1. AGENCY REGISTRATION VERIFICATION
  VERIFY_EMAIL: (agencyName: string, verifyLink: string) => ({
    subject: 'Confirm your EuOnTour Partner account',
    body: `
<p>Hello ${agencyName},</p>
<p>Thank you for registering as an <strong>EuOnTour Partner</strong>.</p>
<p>To complete your registration, please confirm your email address by clicking the button below:</p>
<p style="text-align:center;">
  <a href="${verifyLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Verify Email Address
  </a>
</p>
<p>This link is valid for 24 hours.</p>
<p>If you did not create this account, please ignore this email.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
${EMAIL_FOOTER}`
  }),

  // 2. KYC SUBMITTED (ADMIN NOTIFICATION)
  KYC_SUBMITTED_ADMIN: (agencyName: string, ownerName: string, submittedAt: string, adminLink: string) => ({
    subject: 'New Agency KYC Pending Verification',
    body: `
<p>Hello Admin Team,</p>
<p>A new agency has submitted KYC documents and is pending verification.</p>
<ul>
  <li><strong>Agency:</strong> ${agencyName}</li>
  <li><strong>Owner:</strong> ${ownerName}</li>
  <li><strong>Submitted On:</strong> ${submittedAt}</li>
</ul>
<p>Please review the submission and take action.</p>
<p style="text-align:center;">
  <a href="${adminLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Review KYC Submission
  </a>
</p>
<p>Regards,<br/><strong>EuOnTour System</strong></p>
${EMAIL_FOOTER}`
  }),

  // 3. KYC APPROVED (AGENCY)
  KYC_APPROVED_AGENCY: (agencyName: string, loginLink: string) => ({
    subject: 'Your EuOnTour Partner account is now active',
    body: `
<p>Hello ${agencyName},</p>
<p>We are pleased to inform you that your <strong>business and owner identity verification</strong> has been successfully approved.</p>
<p>Your EuOnTour Partner account is now fully activated.</p>
<p>You can now:</p>
<ul>
  <li>Add wallet funds</li>
  <li>Create bookings</li>
  <li>Access partner tools</li>
</ul>
<p style="text-align:center;">
  <a href="${loginLink}" style="background:#388E3C;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Login to Partner Dashboard
  </a>
</p>
<p>Welcome aboard.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
${EMAIL_FOOTER}`
  }),

  // 4. KYC REJECTED (AGENCY)
  KYC_REJECTED_AGENCY: (agencyName: string, reason: string, kycLink: string) => ({
    subject: 'Action required: KYC verification update needed',
    body: `
<p>Hello ${agencyName},</p>
<p>Thank you for submitting your KYC documents.</p>
<p>After review, we are unable to approve your verification at this time due to the following reason:</p>
<p style="background:#f8d7da;padding:10px;border-radius:4px;">
  <strong>${reason}</strong>
</p>
<p>Please update and resubmit your documents using the link below:</p>
<p style="text-align:center;">
  <a href="${kycLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Update KYC Documents
  </a>
</p>
<p>If you need assistance, please contact our support team.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
${EMAIL_FOOTER}`
  }),

  // 5. ADMIN REMINDER (CRON)
  ADMIN_REMINDER_PENDING: (count: number, hours: number, adminLink: string) => ({
    subject: 'Reminder: Pending Agency Verifications Awaiting Action',
    body: `
<p>Hello Admin Team,</p>
<p>This is a reminder that there are agency KYC submissions pending verification.</p>
<ul>
  <li><strong>Total Pending:</strong> ${count}</li>
  <li><strong>Oldest Pending:</strong> ${hours} hours</li>
</ul>
<p>Please review and take action to avoid onboarding delays.</p>
<p style="text-align:center;">
  <a href="${adminLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Review Pending Verifications
  </a>
</p>
<p>Regards,<br/><strong>EuOnTour System</strong></p>
${EMAIL_FOOTER}`
  }),

  // 6. DEPOSIT SUBMITTED (ADMIN)
  // 6. DEPOSIT SUBMITTED (ADMIN)
  DEPOSIT_SUBMITTED_ADMIN: (agencyName: string, amount: string, ref: string, adminLink: string) => ({
    subject: 'New Agency Deposit Pending Review',
    body: `
<h2>New Deposit Submitted</h2>
<p>An agency has submitted a bank transfer deposit.</p>

<table>
  <tr><td><b>Agency:</b></td><td>${agencyName}</td></tr>
  <tr><td><b>Amount:</b></td><td>${amount}</td></tr>
  <tr><td><b>Reference:</b></td><td>${ref}</td></tr>
</table>

<p>
  <a href="${adminLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Review Deposit
  </a>
</p>
${EMAIL_FOOTER}`
  }),

  // 7. DEPOSIT VERIFIED (SUPER ADMIN)
  // 7. DEPOSIT VERIFIED (SUPER ADMIN)
  DEPOSIT_VERIFIED_SUPER_ADMIN: (agencyName: string, amount: string, verifiedAt: string, superLink: string) => ({
    subject: 'Deposit Ready for Final Approval',
    body: `
<h2>Deposit Verification Completed</h2>
<p>The following deposit has been verified by Admin and requires final approval.</p>

<table>
  <tr><td><b>Agency:</b></td><td>${agencyName}</td></tr>
  <tr><td><b>Amount:</b></td><td>${amount}</td></tr>
  <tr><td><b>Verified At:</b></td><td>${verifiedAt}</td></tr>
</table>

<p>
  <a href="${superLink}" style="background:#1976D2;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Approve Deposit
  </a>
</p>
${EMAIL_FOOTER}`
  }),

  // 8. DEPOSIT APPROVED (AGENCY)
  // 8. DEPOSIT APPROVED (AGENCY)
  DEPOSIT_APPROVED: (agencyName: string, amount: string, balance: string, creditedAt: string) => ({
    subject: 'Deposit Credited to Your Wallet',
    body: `
<h2>Wallet Credit Successful</h2>
<p>Your deposit has been approved and credited to your wallet.</p>

<table>
  <tr><td><b>Credited Amount:</b></td><td>${amount}</td></tr>
  <tr><td><b>New Wallet Balance:</b></td><td>${balance}</td></tr>
  <tr><td><b>Date:</b></td><td>${creditedAt}</td></tr>
</table>

<p>You may now proceed with bookings.</p>
${EMAIL_FOOTER}`
  }),

  // 7. BOOKING CONFIRMATION
  BOOKING_CONFIRMED: (agencyName: string, ref: string, tourName: string, amount: string, balance: string) => ({
    subject: 'Booking confirmed successfully',
    body: `
<p>Hello ${agencyName},</p>
<p>Your booking has been successfully created.</p>
<ul>
  <li><strong>Booking Reference:</strong> ${ref}</li>
  <li><strong>Tour:</strong> ${tourName}</li>
  <li><strong>Amount Debited:</strong> ${amount}</li>
  <li><strong>Remaining Wallet Balance:</strong> ${balance}</li>
</ul>
<p>Thank you for partnering with EuOnTour.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
${EMAIL_FOOTER}`
  }),

  // 9. KYC MANUAL UPDATE (SUPER ADMIN OVERRIDE)
  KYC_STATUS_UPDATE_MANUAL: (agencyName: string, status: string, note: string) => ({
    subject: `Agency Verification Status Updated: ${status}`,
    body: `
<p>Hello ${agencyName},</p>
<p>Your verification status has been manually updated to: <strong>${status}</strong> by an administrator.</p>
${note ? `<p><strong>Admin Note:</strong><br/>${note}</p>` : ''}
<p>Please log in to your dashboard to view details.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
${EMAIL_FOOTER}`
  }),

  // 10. KYC WARNING DEACTIVATION (SUPER ADMIN)
  KYC_WARNING_DEACTIVATION: (agencyName: string, daysLimit: number, loginLink: string) => ({
    subject: 'URGENT: Action Required to Prevent Account Deactivation',
    body: `
<p>Hello ${agencyName},</p>
<p style="color:#D32F2F;font-weight:bold;">Action Required: Update your KYC documents immediately.</p>
<p>Our records indicate your <strong>Passport</strong> or <strong>Trade License</strong> information is missing, invalid, or expired.</p>
<p><strong>Failure to provide valid documentation within ${daysLimit} days will result in immediate account deactivation.</strong></p>
<p>Please log in and update your KYC profile to comply with verification standards:</p>
<p style="text-align:center;">
  <a href="${loginLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;">
    Update KYC Now
  </a>
</p>
<p>If you have already sent these forms to your account manager, please ignore this notice.</p>
<p>Regards,<br/><strong>EuOnTour Compliance Team</strong></p>
${EMAIL_FOOTER}`
  })
};
