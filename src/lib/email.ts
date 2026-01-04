interface EmailParams {
    to: string;
    subject: string;
    body: string; // Plain text or HTML
}

import { sendEmailBrevo } from './email/brevo';

/**
 * Sends an email asynchronously.
 * Uses Brevo if BREVO_API_KEY is allowed, otherwise Mock.
 */
export async function sendEmail(params: EmailParams) {
    if (process.env.BREVO_API_KEY) {
        return sendEmailBrevo(params);
    }

    // Mock Implementation
    // Simulate non-blocking async behavior
    setTimeout(() => {
        console.log(`
      [MOCK EMAIL SERVICE]
      To: ${params.to}
      Subject: ${params.subject}
      -------------------
      ${params.body}
      -------------------
    `);
    }, 100);
}

export const EMAIL_TEMPLATES = {
    DEPOSIT_RECEIVED: (amount: string, ref: string) => ({
        subject: 'Deposit Received',
        body: `We have received your deposit request of €${amount} (Ref: ${ref}). It is currently under review.`
    }),
    DEPOSIT_APPROVED: (amount: string) => ({
        subject: 'Deposit Approved',
        body: `Your deposit of €${amount} has been approved and credited to your wallet.`
    }),
    DEPOSIT_REJECTED: (amount: string) => ({
        subject: 'Deposit Rejected',
        body: `Your deposit of €${amount} has been rejected. Please contact support for details.`
    }),
    BOOKING_CONFIRMED: (bookingId: string, tourName: string) => ({
        subject: 'Booking Confirmed',
        body: `Your booking for ${tourName} (ID: ${bookingId}) has been confirmed.`
    }),
    VERIFICATION_APPROVED: {
        subject: 'Account Verified',
        body: `Congratulations! Your agency account has been verified. You can now make booking reservations.`
    },
    VERIFICATION_REJECTED: {
        subject: 'Verification Update',
        body: `We could not verify your agency account at this time. Please check the dashboard for details.`
    }
};
