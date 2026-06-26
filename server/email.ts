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

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: 'Confirm your H.E.R.S.365 email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; padding: 32px; border-radius: 12px;">
        <h1 style="color: #ff6b35; font-size: 24px; margin-bottom: 8px;">H.E.R.S.365</h1>
        <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 16px;">Confirm your email address</h2>
        <p style="color: #aaaaaa; margin-bottom: 24px;">
          One more step — confirm your email so coaches can find you in search.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: #ff6b35; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 24px;">
          Confirm Email
        </a>
        <p style="color: #666666; font-size: 12px; margin-top: 24px;">
          This link expires in 24 hours. If you did not sign up, ignore this email.
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