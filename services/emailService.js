const nodemailer = require('nodemailer');
const { validateEmailData } = require('../utils/validation');
const csvService = require('./csvService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify transporter configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:', error.message);
        } else {
          console.log('✅ Email server is ready to send messages');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      throw new Error('Email service initialization failed');
    }
  }

  async sendEmail(emailData, formData = null, formType = 'custom') {
    try {
      // Validate email data
      const validation = validateEmailData(emailData);
      if (!validation.isValid) {
        throw new Error(`Email validation failed: ${validation.errors.join(', ')}`);
      }

      // Log form data to CSV before sending email
      if (formData) {
        try {
          await csvService.writeToCSV(formData, formType);
          console.log(`✅ Form data logged to CSV for ${formType} form`);
        } catch (csvError) {
          console.warn(`⚠️ CSV logging failed for ${formType} form:`, csvError.message);
          // Continue with email sending even if CSV logging fails
        }
      }

      const { to, subject, text, html, attachments, cc, bcc } = emailData;

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments || [],
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', {
        messageId: result.messageId,
        to: to,
        subject: subject
      });

      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

module.exports = new EmailService();
