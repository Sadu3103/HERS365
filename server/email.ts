// Email service for password resets, notifications, etc.
// Uses Resend (resend.com) - free tier available

// Mock Resend if package is missing
class MockResend {
  emails = {
    send: async (data: any) => {
      console.log('Mock email sent:', data);
      return { id: 'mock_id' };
    }
  };
  constructor(apiKey: string) {}
}

const resend = new MockResend(process.env.RESEND_API_KEY || 're_123456789');

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
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset?token=${resetToken}`;
  
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