// Email service for password resets, notifications, etc.
// Uses Resend (resend.com) - free tier available

class MockResend {
  emails = {
    send: async (data: any) => {
      console.warn(`[email] DEV MODE — email to ${data.to} (${data.subject}) was not sent. Set RESEND_API_KEY for real delivery.`);
      return { id: `mock_${Date.now()}` };
    }
  };
  constructor(_apiKey: string) {}
}

const resend = new MockResend(process.env.RESEND_API_KEY || '');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: from || 'noreply@hers365.com',
      to,
      subject,
      html,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to,
    subject: 'Reset your H.E.R.S.365 password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🏈 H.E.R.S.365 Password Reset</h1>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p>If you didn't request this, please ignore this email.</p>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          This link expires in 1 hour.
        </p>
      </div>
    `,
  });
}

export async function sendEmailVerificationEmail(to: string, token: string) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to,
    subject: 'Verify your H.E.R.S.365 email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Verify your H.E.R.S.365 email</h1>
        <p>Thanks for registering. Please verify your email to activate your account:</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p>If you did not create this account, you can ignore this message.</p>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          This link expires in 24 hours.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to H.E.R.S.365!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🏈 Welcome to H.E.R.S.365, ${name}!</h1>
        <p>You're now part of the premier platform for female athletes.</p>
        <ul>
          <li>📊 Track your rankings and stats</li>
          <li>🎓 Get discovered by college coaches</li>
          <li>💰 Build your NIL brand</li>
          <li>🏋️ Personalized training plans</li>
        </ul>
        <p>Let's get started!</p>
      </div>
    `,
  });
}