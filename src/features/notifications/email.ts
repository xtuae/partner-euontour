// Placeholder for Brevo Email Service
// TODO: Implement actual Brevo API call

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    console.log(`[Email Service] Sending password reset to ${email}`);
    console.log(`[Email Service] Reset Link: ${resetLink}`);

    return true;
}
