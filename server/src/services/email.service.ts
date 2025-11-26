import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PasswordResetEmailData {
  email: string;
  resetToken: string;
  name?: string;
}

interface EmailVerificationData {
  email: string;
  verificationToken: string;
  name?: string;
}

interface WelcomeEmailData {
  email: string;
  name?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  /**
   * Initialize the email service
   * Uses SendGrid SMTP if API key is configured
   */
  async initialize(): Promise<void> {
    try {
      if (!config.email.sendgridApiKey) {
        logger.warn('SendGrid API key not configured - email service disabled');
        return;
      }

      // Create SendGrid SMTP transporter
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false, // Use TLS
        auth: {
          user: 'apikey', // SendGrid username is always 'apikey'
          pass: config.email.sendgridApiKey,
        },
      });

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
      }
      this.isInitialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize email service');
      throw error;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isInitialized || !this.transporter) {
      logger.warn({ to: options.to, subject: options.subject }, 'Email service not initialized - email not sent');

      // In development, log the email content
      if (config.isDevelopment) {
        logger.info(
          {
            to: options.to,
            subject: options.subject,
            html: options.html,
          },
          'Email content (not sent - service disabled)'
        );
      }
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `${config.email.fromName} <${config.email.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(
        {
          messageId: info.messageId,
          to: options.to,
          subject: options.subject,
        },
        'Email sent successfully'
      );
    } catch (error) {
      logger.error(
        {
          error,
          to: options.to,
          subject: options.subject,
        },
        'Failed to send email'
      );
      throw new ApiError(500, 'Failed to send email', 'EMAIL_SEND_ERROR');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const resetUrl = `ideaspark://reset-password?token=${data.resetToken}`;
    const webResetUrl = `https://ideaspark.app/reset-password?token=${data.resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #6366F1;
            margin-bottom: 10px;
          }
          h1 {
            color: #111827;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: #6366F1;
            color: #ffffff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background: #5A54E6;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          .warning {
            background: #FEF2F2;
            border-left: 4px solid #EF4444;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
          code {
            background: #F3F4F6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ IdeaSpark</div>
          </div>

          <h1>Reset Your Password</h1>

          <p>Hi${data.name ? ` ${data.name}` : ''},</p>

          <p>We received a request to reset your password for your IdeaSpark account. Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p><code>${webResetUrl}</code></p>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
          </div>

          <div class="footer">
            <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
            <p>© ${new Date().getFullYear()} IdeaSpark. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Reset Your Password

Hi${data.name ? ` ${data.name}` : ''},

We received a request to reset your password for your IdeaSpark account.

Reset your password by opening this link: ${resetUrl}

Or use this web link: ${webResetUrl}

⚠️ Security Notice:
This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} IdeaSpark
    `.trim();

    await this.sendEmail({
      to: data.email,
      subject: 'Reset Your IdeaSpark Password',
      html,
      text,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(data: EmailVerificationData): Promise<void> {
    const verificationUrl = `ideaspark://verify-email?token=${data.verificationToken}`;
    const webVerificationUrl = `https://ideaspark.app/verify-email?token=${data.verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #6366F1;
            margin-bottom: 10px;
          }
          h1 {
            color: #111827;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: #6366F1;
            color: #ffffff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          code {
            background: #F3F4F6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ IdeaSpark</div>
          </div>

          <h1>Verify Your Email Address</h1>

          <p>Hi${data.name ? ` ${data.name}` : ''},</p>

          <p>Thanks for signing up for IdeaSpark! Please verify your email address to get started:</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p><code>${webVerificationUrl}</code></p>

          <div class="footer">
            <p>If you didn't create an IdeaSpark account, you can safely ignore this email.</p>
            <p>© ${new Date().getFullYear()} IdeaSpark. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Verify Your Email Address

Hi${data.name ? ` ${data.name}` : ''},

Thanks for signing up for IdeaSpark! Please verify your email address to get started.

Verify your email: ${verificationUrl}

Or use this web link: ${webVerificationUrl}

If you didn't create an IdeaSpark account, you can safely ignore this email.

© ${new Date().getFullYear()} IdeaSpark
    `.trim();

    await this.sendEmail({
      to: data.email,
      subject: 'Verify Your IdeaSpark Email',
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to IdeaSpark</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #6366F1;
            margin-bottom: 10px;
          }
          h1 {
            color: #111827;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .feature {
            background: #F9FAFB;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
          }
          .feature h3 {
            color: #6366F1;
            margin: 0 0 8px 0;
            font-size: 18px;
          }
          .button {
            display: inline-block;
            background: #6366F1;
            color: #ffffff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ IdeaSpark</div>
          </div>

          <h1>Welcome to IdeaSpark!</h1>

          <p>Hi${data.name ? ` ${data.name}` : ''},</p>

          <p>We're excited to have you on board! IdeaSpark helps you transform your ideas into actionable plans with AI-powered insights.</p>

          <div class="feature">
            <h3>💡 Interactive AI Chat</h3>
            <p>Have conversations with AI to explore and refine your ideas.</p>
          </div>

          <div class="feature">
            <h3>🎯 Smart Suggestions</h3>
            <p>Get personalized recommendations based on your idea category.</p>
          </div>

          <div class="feature">
            <h3>🚀 Action Plans</h3>
            <p>Transform your ideas into structured, actionable plans.</p>
          </div>

          <div style="text-align: center;">
            <a href="ideaspark://home" class="button">Get Started</a>
          </div>

          <div class="footer">
            <p>Need help? Contact us at support@ideaspark.app</p>
            <p>© ${new Date().getFullYear()} IdeaSpark. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to IdeaSpark!

Hi${data.name ? ` ${data.name}` : ''},

We're excited to have you on board! IdeaSpark helps you transform your ideas into actionable plans with AI-powered insights.

💡 Interactive AI Chat
Have conversations with AI to explore and refine your ideas.

🎯 Smart Suggestions
Get personalized recommendations based on your idea category.

🚀 Action Plans
Transform your ideas into structured, actionable plans.

Need help? Contact us at support@ideaspark.app

© ${new Date().getFullYear()} IdeaSpark
    `.trim();

    await this.sendEmail({
      to: data.email,
      subject: 'Welcome to IdeaSpark! 🎉',
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
