export interface EmailPayload {
    to: string;
    subject: string;
    body: string; // HTML content
}

export interface IEmailService {
    send(payload: EmailPayload): Promise<void>;
}

export const mockEmailService: IEmailService = {
    async send(payload: EmailPayload): Promise<void> {
        console.log('--- [MOCK EMAIL SENT] ---');
        console.log(`To: ${payload.to}`);
        console.log(`Subject: ${payload.subject}`);
        console.log('Body Preview:', payload.body.substring(0, 100) + '...');
        console.log('-------------------------');
        return Promise.resolve();
    }
};
