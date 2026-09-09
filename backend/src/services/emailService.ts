import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

let transporter: any = null;

function getTransporter(): any {
  if (transporter) {
    return transporter;
  }

  if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASS) {
    throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_PORT === 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS
    }
  });

  return transporter;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verificationUrl = `${ENV.FRONTEND_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"AcuSlot" <${ENV.SENDER_EMAIL || ENV.SMTP_USER}>`,
    to,
    subject: 'Verify your email address',
    text: `Please click this link to verify your email: ${verificationUrl}`,
    html: `<p>Please click <a href="${verificationUrl}">this link</a> to verify your email address.</p>`
  };

  try {
    await getTransporter().sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
}

export async function verifyTransporter(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch (error) {
    console.error('SMTP transporter verification failed:', error);
    return false;
  }
}