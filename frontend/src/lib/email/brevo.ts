import * as Brevo from '@getbrevo/brevo';

interface EmailParams {
    to: string;
    subject: string;
    body: string;
}

const apiInstance = new Brevo.TransactionalEmailsApi();
// Configure API key authorization: apiKey
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

export async function sendEmailBrevo({ to, subject, body }: EmailParams) {
    if (!process.env.BREVO_API_KEY) {
        console.warn('BREVO_API_KEY is missing. Email not sent.');
        return;
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = body;
    sendSmtpEmail.sender = { "name": "EuOnTour Partner", "email": process.env.BREVO_SENDER_EMAIL || "noreply@euontour.com" };
    sendSmtpEmail.to = [{ "email": to }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully. Message ID:', data.body.messageId);
    } catch (error) {
        console.error('Error sending email via Brevo:', error);
        throw error;
    }
}
