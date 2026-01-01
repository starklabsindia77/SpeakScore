import { env } from '../env';
import { logger } from '../logger';

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail(opts: SendEmailOptions) {
    // In a real implementation, you would use nodemailer or a service like SendGrid/AWS SES
    // For now, we'll log to the console as per the implementation plan

    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
        // Placeholder for future nodemailer implementation
        // const transporter = nodemailer.createTransport({ ... });
        // await transporter.sendMail({ from: env.SMTP_FROM, ...opts });
        logger.info({ to: opts.to, subject: opts.subject }, 'Email would be sent via SMTP');
    } else {
        logger.info('--- EMAIL EMULATED ---');
        logger.info(`To: ${opts.to}`);
        logger.info(`Subject: ${opts.subject}`);
        logger.info(`Body: ${opts.html}`);
        logger.info('-----------------------');
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb;">Reset your SpeakScore password</h2>
      <p>A password reset was requested for your SpeakScore account. Click the button below to set a new password:</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">SpeakScore Recruiter Console</p>
    </div>
  `;

    await sendEmail({
        to: email,
        subject: 'Reset your SpeakScore password',
        html
    });
}
