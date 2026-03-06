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

const getHeader = () => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
  <div style="background-color: #f8f9fa; padding: 24px 20px; text-align: center; border-bottom: 3px solid #D32F2F;">
    <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.webp" alt="EuOnTour Logo" style="max-height: 45px; width: auto;" />
  </div>
  <div style="padding: 32px 24px; color: #334155; line-height: 1.6; font-size: 15px;">
`;

const getFooter = () => `
  </div>
  <div style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e5e5e5;">
    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #475569;">EuOnTour Partners</p>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">This is a system-generated email. Please do not reply.</p>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">If you need help, contact <a href="mailto:support@euontour.com" style="color: #D32F2F; text-decoration: none;">support@euontour.com</a></p>
  </div>
</div>
`;

export const EMAIL_TEMPLATES = {
  // 1. AGENCY REGISTRATION VERIFICATION
  VERIFY_EMAIL: (agencyName: string, verifyLink: string) => ({
    subject: 'Confirm your EuOnTour Partner account',
    body: getHeader() + `
<p>Hello ${agencyName},</p>
<p>Thank you for registering as an <strong>EuOnTour Partner</strong>.</p>
<p>To complete your registration, please confirm your email address by clicking the button below:</p>
<p style="text-align:center; padding-top: 10px;">
  <a href="${verifyLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Verify Email Address
  </a>
</p>
<p>This link is valid for 24 hours.</p>
<p>If you did not create this account, please ignore this email.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
` + getFooter()
  }),

  // 2. KYC SUBMITTED (ADMIN NOTIFICATION)
  KYC_SUBMITTED_ADMIN: (agencyName: string, ownerName: string, submittedAt: string, adminLink: string) => ({
    subject: 'New Agency KYC Pending Verification',
    body: getHeader() + `
<p>Hello Admin Team,</p>
<p>A new agency has submitted KYC documents and is pending verification.</p>
<ul style="padding-left: 20px;">
  <li><strong>Agency:</strong> ${agencyName}</li>
  <li><strong>Owner:</strong> ${ownerName}</li>
  <li><strong>Submitted On:</strong> ${submittedAt}</li>
</ul>
<p>Please review the submission and take action.</p>
<p style="text-align:center; padding-top: 10px;">
  <a href="${adminLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Review KYC Submission
  </a>
</p>
<p>Regards,<br/><strong>EuOnTour System</strong></p>
` + getFooter()
  }),

  // 3. KYC APPROVED (AGENCY)
  KYC_APPROVED_AGENCY: (agencyName: string, loginLink: string) => ({
    subject: 'Your EuOnTour Partner account is now active',
    body: getHeader() + `
<p>Hello ${agencyName},</p>
<p>We are pleased to inform you that your <strong>business and owner identity verification</strong> has been successfully approved.</p>
<p>Your EuOnTour Partner account is now fully activated.</p>
<p>You can now:</p>
<ul style="padding-left: 20px;">
  <li>Add wallet funds</li>
  <li>Create bookings</li>
  <li>Access partner tools</li>
</ul>
<p style="text-align:center; padding-top: 10px;">
  <a href="${loginLink}" style="background:#388E3C;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Login to Partner Dashboard
  </a>
</p>
<p>Welcome aboard.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
` + getFooter()
  }),

  // 4. KYC REJECTED (AGENCY)
  KYC_REJECTED_AGENCY: (agencyName: string, reason: string, kycLink: string) => ({
    subject: 'Action required: KYC verification update needed',
    body: getHeader() + `
<p>Hello ${agencyName},</p>
<p>Thank you for submitting your KYC documents.</p>
<p>After review, we are unable to approve your verification at this time due to the following reason:</p>
<p style="background:#fef2f2;padding:12px;border-left:4px solid #ef4444;border-radius:4px;color:#991b1b;">
  <strong>${reason}</strong>
</p>
<p>Please update and resubmit your documents using the link below:</p>
<p style="text-align:center; padding-top: 10px;">
  <a href="${kycLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Update KYC Documents
  </a>
</p>
<p>If you need assistance, please contact our support team.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
` + getFooter()
  }),

  // 5. ADMIN REMINDER (CRON)
  ADMIN_REMINDER_PENDING: (count: number, hours: number, adminLink: string) => ({
    subject: 'Reminder: Pending Agency Verifications Awaiting Action',
    body: getHeader() + `
<p>Hello Admin Team,</p>
<p>This is a reminder that there are agency KYC submissions pending verification.</p>
<ul style="padding-left: 20px;">
  <li><strong>Total Pending:</strong> ${count}</li>
  <li><strong>Oldest Pending:</strong> ${hours} hours</li>
</ul>
<p>Please review and take action to avoid onboarding delays.</p>
<p style="text-align:center; padding-top: 10px;">
  <a href="${adminLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Review Pending Verifications
  </a>
</p>
<p>Regards,<br/><strong>EuOnTour System</strong></p>
` + getFooter()
  }),

  // 6. DEPOSIT SUBMITTED (ADMIN)
  DEPOSIT_SUBMITTED_ADMIN: (agencyName: string, amount: string, ref: string, adminLink: string) => ({
    subject: 'New Agency Deposit Pending Review',
    body: getHeader() + `
<h2 style="color:#D32F2F; margin-top:0;">New Deposit Submitted</h2>
<p>An agency has submitted a bank transfer deposit.</p>
<table style="width:100%; border-collapse: collapse; margin-top: 10px;">
  <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Agency:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${agencyName}</td></tr>
  <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${amount}</td></tr>
  <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Reference:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${ref}</td></tr>
</table>
<p style="text-align:center; margin-top: 24px;">
  <a href="${adminLink}" style="background:#D32F2F;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Review Deposit
  </a>
</p>
` + getFooter()
  }),

  // 7. DEPOSIT VERIFIED (SUPER ADMIN)
  DEPOSIT_VERIFIED_SUPER_ADMIN: (agencyName: string, amount: string, verifiedAt: string, superLink: string) => ({
    subject: 'Deposit Ready for Final Approval',
    body: getHeader() + `
<h2 style="color:#1976D2; margin-top:0;">Deposit Verification Completed</h2>
<p>The following deposit has been verified by Admin and requires final approval.</p>
<table style="width:100%; border-collapse: collapse; margin-top: 10px;">
  <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Agency:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${agencyName}</td></tr>
  <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${amount}</td></tr>
  <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Verified At:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${verifiedAt}</td></tr>
</table>
<p style="text-align:center; margin-top: 24px;">
  <a href="${superLink}" style="background:#1976D2;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Approve Deposit
  </a>
</p>
` + getFooter()
  }),

  // 8. DEPOSIT APPROVED (AGENCY)
  DEPOSIT_APPROVED: (agencyName: string, amount: string, balance: string, creditedAt: string) => ({
    subject: 'Deposit Credited to Your Wallet',
    body: getHeader() + `
<h2 style="color:#388E3C; margin-top:0;">Wallet Credit Successful</h2>
<p>Hello ${agencyName},</p>
<p>Your deposit has been approved and credited to your wallet.</p>
<table style="width:100%; border-collapse: collapse; background: #f8f9fa; border: 1px solid #e5e5e5; padding: 16px; border-radius: 4px; margin: 16px 0;">
  <tr><td style="padding: 12px; border-bottom: 1px solid #e5e5e5;"><strong>Credited Amount:</strong></td><td style="padding: 12px; border-bottom: 1px solid #e5e5e5; font-weight: bold; color: #15803d;">${amount}</td></tr>
  <tr><td style="padding: 12px; border-bottom: 1px solid #e5e5e5;"><strong>New Wallet Balance:</strong></td><td style="padding: 12px; border-bottom: 1px solid #e5e5e5; font-weight: bold;">${balance}</td></tr>
  <tr><td style="padding: 12px;"><strong>Date:</strong></td><td style="padding: 12px;">${creditedAt}</td></tr>
</table>
<p>You may now proceed with bookings.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
` + getFooter()
  }),

  // 12. DEPOSIT REJECTED (AGENCY)
  DEPOSIT_REJECTED: (agencyName: string, amount: string, reason: string) => ({
    subject: `Wallet Top-Up Rejected - Action Required`,
    body: getHeader() + `
<h2 style="color:#D32F2F; margin-top:0;">Deposit Verification Failed</h2>
<p>Hello ${agencyName},</p>
<p>Your recent offline bank deposit request of <strong>AED ${amount}</strong> has unfortunately been rejected by our billing team.</p>
<p><strong>Reason for Rejection:</strong></p>
<p style="background:#fef2f2;padding:12px;border-left:4px solid #ef4444;border-radius:4px;color:#991b1b;">
  <strong>${reason}</strong>
</p>
<p>Your wallet balance has not been credited. Please review the reason above, make the necessary corrections, and submit a new deposit request attaching the correct proof of transfer.</p>
<p>If you believe this was an error, please contact our support team immediately.</p>
<p>Regards,<br/><strong>EuOnTour Partner Billing</strong></p>
` + getFooter()
  }),

  // 9. BOOKING CONFIRMATION
  BOOKING_CONFIRMED: (agencyName: string, ref: string, tourName: string, amount: string, balance: string) => ({
    subject: 'Booking confirmed successfully',
    body: getHeader() + `
<p>Hello ${agencyName},</p>
<p>Your booking has been successfully created.</p>
<ul style="padding-left: 20px;">
  <li><strong>Booking Reference:</strong> ${ref}</li>
  <li><strong>Tour:</strong> ${tourName}</li>
  <li><strong>Amount Debited:</strong> ${amount}</li>
  <li><strong>Remaining Wallet Balance:</strong> ${balance}</li>
</ul>
<p>Thank you for partnering with EuOnTour.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
` + getFooter()
  }),

  // 10. KYC MANUAL UPDATE (SUPER ADMIN OVERRIDE)
  KYC_STATUS_UPDATE_MANUAL: (agencyName: string, status: string, note: string) => ({
    subject: `Agency Verification Status Updated: ${status}`,
    body: getHeader() + `
<p>Hello ${agencyName},</p>
<p>Your verification status has been manually updated to: <strong>${status}</strong> by an administrator.</p>
${note ? `<p style="background:#fef2f2;padding:12px;border-left:4px solid #ef4444;border-radius:4px;color:#991b1b;margin-top:10px;"><strong>Admin Note:</strong><br/>${note}</p>` : ''}
<p>Please log in to your dashboard to view details.</p>
<p>Regards,<br/><strong>EuOnTour Partner Team</strong></p>
` + getFooter()
  }),

  // 11. KYC WARNING DEACTIVATION (SUPER ADMIN)
  KYC_WARNING_DEACTIVATION: (agencyName: string, daysLimit: number, loginLink: string) => ({
    subject: 'URGENT: Action Required to Prevent Account Deactivation',
    body: getHeader() + `
<p>Hello ${agencyName},</p>
<p style="color:#D32F2F;font-weight:bold;font-size:16px;">Action Required: Update your KYC documents immediately.</p>
<p>Our records indicate your <strong>Passport</strong> or <strong>Trade License</strong> information is missing, invalid, or expired.</p>
<p style="background:#fef2f2;padding:12px;border-left:4px solid #ef4444;border-radius:4px;color:#991b1b;"><strong>Failure to provide valid documentation within ${daysLimit} days will result in immediate account deactivation.</strong></p>
<p>Please log in and update your KYC profile to comply with verification standards:</p>
<p style="text-align:center; padding-top: 10px;">
  <a href="${loginLink}" style="background:#D32F2F;color:#ffffff;padding:14px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
    Update KYC Now
  </a>
</p>
<p>If you have already sent these forms to your account manager, please ignore this notice.</p>
<p>Regards,<br/><strong>EuOnTour Compliance Team</strong></p>
` + getFooter()
  })
};
