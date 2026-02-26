const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // Send comprehensive welcome email with verification
  async sendWelcomeEmailWithVerification(userEmail, userName, verificationToken) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: userEmail,
      subject: 'Welcome to Gracie - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #53ABB5;">Welcome to Anchored by Grace, ${userName}!</h2>
          <p>Thank you for joining Gracie, your AI-powered recovery companion.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #53ABB5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-family: 'BioRhyme', serif; font-size: 16px;">
              Verify Your Email
            </a>
          </div>

          <p style="text-align: center; margin: 20px 0;">
            <a href="https://www.anchoredbygrace.online" style="background-color: transparent; color: #53ABB5; padding: 12px 24px; text-decoration: none; border: 2px solid #53ABB5; border-radius: 25px; display: inline-block; font-family: 'BioRhyme', serif;">
              Visit Our Website
            </a>
          </p>

          <h3 style="color: #53ABB5;">Important Information</h3>
          <p><strong>Gracie is NOT:</strong></p>
          <ul>
            <li>A replacement for professional medical advice</li>
            <li>Monitored 24/7 for emergencies</li>
            <li>A substitute for qualified healthcare professionals</li>
          </ul>

          <div style="background-color: #fee; border-left: 4px solid #c33; padding: 15px; margin: 20px 0;">
            <h4 style="color: #c33; margin-top: 0;">🚨 In Case of Emergency</h4>
            <p style="margin: 5px 0;"><strong>Emergency Services:</strong> 000</p>
            <p style="margin: 5px 0;"><strong>Lifeline (24/7):</strong> 13 11 14</p>
            <p style="margin: 5px 0;"><strong>Beyond Blue:</strong> 1300 22 4636</p>
            <p style="margin: 5px 0;"><strong>Drug & Alcohol Info:</strong> 1800 250 015</p>
          </div>

          <h3 style="color: #53ABB5;">Your Privacy & Legal Framework</h3>
          <p>We take your privacy seriously. Your data is encrypted and stored securely in accordance with Australian privacy laws.</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="https://www.anchoredbygrace.online/privacy" style="background-color: transparent; color: #53ABB5; padding: 10px 20px; text-decoration: none; border: 2px solid #53ABB5; border-radius: 25px; display: inline-block; font-family: 'BioRhyme', serif;">
              View Privacy Policy & Legal Framework
            </a>
          </p>

          <h3 style="color: #53ABB5;">Age Requirement</h3>
          <p>This service is for individuals 18 years and older. By using Gracie, you confirm you meet this requirement.</p>

          <p style="margin-top: 30px;">If you have questions, reply to this email or visit our website at <a href="https://www.anchoredbygrace.online" style="color: #53ABB5;">www.anchoredbygrace.online</a></p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Anchored by Grace<br>
            rachael@anchoredbygrace.online
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email with verification sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userEmail, userName, token) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: userEmail,
      subject: 'Reset Your Password - Anchored by Grace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #53ABB5;">Reset Your Password</h2>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #53ABB5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>

          <p><strong>This link expires in 1 hour.</strong></p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  // Send consent notification to admin
  async sendConsentNotificationToAdmin(userEmail, userName, consentTimestamp) {
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: process.env.SMTP_FROM_EMAIL,
      subject: 'New User Consent - Gracie',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #53ABB5;">New User Registered</h2>
          <p><strong>User Name:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Consent Given:</strong> ${new Date(consentTimestamp).toLocaleString('en-AU')}</p>
          <p><strong>Legal Consent:</strong> ✅ Accepted</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Admin consent notification sent');
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  // Send crisis alert to admin
  async sendCrisisAlert(userId, userName, userEmail, userPhone, crisisMessage) {
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: process.env.SMTP_FROM_EMAIL,
      subject: '🚨 URGENT: Crisis Alert - Gracie User Needs Attention',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fee; border-left: 4px solid #c33; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #c33; margin-top: 0;">🚨 IMMEDIATE CRISIS ALERT</h2>
          </div>

          <h3>User Information:</h3>
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Phone:</strong> ${userPhone || 'Not provided'}</p>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-AU')}</p>

          <h3>Crisis Message:</h3>
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0;">
            <p style="margin: 0;">"${crisisMessage}"</p>
          </div>

          <h3>Recommended Actions:</h3>
          <ul>
            <li>Review the user's recent chat history in the system</li>
            <li>Consider reaching out via email or phone if provided</li>
            <li>Document this incident for follow-up</li>
          </ul>

          <p style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; margin-top: 20px;">
            <strong>Note:</strong> User was shown emergency contact numbers (000, Lifeline 13 11 14, Beyond Blue 1300 22 4636)
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Crisis alert email sent to admin');
    } catch (error) {
      console.error('Error sending crisis alert email:', error);
    }
  }
}

module.exports = new EmailService();
