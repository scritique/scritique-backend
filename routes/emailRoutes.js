const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const csvService = require('../services/csvService');
const { validateEmailData } = require('../utils/validation');
const { upload, handleFileUploadError, cleanupUploadedFile } = require('../middleware/fileUpload');

// Single sendEmail endpoint that handles all email types
router.post('/sendEmail', upload.single('resume'), handleFileUploadError, async (req, res, next) => {
  try {
    const { 
      to_email, 
      subject, 
      message, 
      from_name, 
      from_email, 
      phone, 
      service, 
      experience, 
      cover_letter, 
      industry, 
      role_title,
      formType = 'custom' // Optional form type for logging
    } = req.body;

    // Validate required fields
    if (!to_email || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'to_email, subject, and message are required'
      });
    }

    // Handle uploaded resume file
    let attachments = [];
    if (req.file) {
      // Read file content for attachment
      const fs = require('fs');
      const fileContent = fs.readFileSync(req.file.path);
      attachments.push({
        filename: req.file.originalname,
        content: fileContent,
        contentType: req.file.mimetype
      });
    }

    // Create email data object
    const emailData = {
      to: to_email,
      subject: subject,
      text: message, // Plain text version
      html: createHTMLMessage({
        message,
        from_name,
        from_email,
        phone,
        service,
        experience,
        cover_letter,
        resume: req.file ? req.file.originalname : '',
        industry,
        role_title,
        formType
      }),
      attachments: attachments
    };

    // Validate email data
    const validation = validateEmailData(emailData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Prepare form data for CSV logging
    const csvFormData = {
      timestamp: new Date().toISOString(),
      form_type: formType,
      from_name: from_name || '',
      from_email: from_email || '',
      phone: phone || '',
      service: service || '',
      industry: industry || '',
      role_title: role_title || '',
      experience: experience || '',
      cover_letter: cover_letter || '',
      resume_filename: req.file ? req.file.originalname : '',
      message: message || ''
    };

    // Send email with CSV logging
    const result = await emailService.sendEmail(emailData, csvFormData, formType);
    
    // Clean up uploaded file after email is sent
    if (req.file) {
      cleanupUploadedFile(req.file.path);
    }
    
    console.log(`✅ Email sent successfully (${formType}):`, {
      messageId: result.messageId,
      to: to_email,
      subject: subject,
      from: from_email || 'anonymous',
      hasResume: !!req.file
    });

    res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully',
      hasResume: !!req.file
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to create HTML message
function createHTMLMessage(data) {
  const {
    message,
    from_name,
    from_email,
    phone,
    service,
    experience,
    cover_letter,
    resume,
    industry,
    role_title,
    formType
  } = data;

  let htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">New ${formType.charAt(0).toUpperCase() + formType.slice(1)} Form Submission</h1>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
  `;

  // Add sender information
  if (from_name) {
    htmlContent += `<p><strong>Name:</strong> ${from_name}</p>`;
  }
  if (from_email) {
    htmlContent += `<p><strong>Email:</strong> ${from_email}</p>`;
  }
  if (phone) {
    htmlContent += `<p><strong>Phone:</strong> ${phone}</p>`;
  }
  if (service) {
    htmlContent += `<p><strong>Service:</strong> ${service}</p>`;
  }
  if (industry) {
    htmlContent += `<p><strong>Industry:</strong> ${industry}</p>`;
  }
  if (experience) {
    htmlContent += `<p><strong>Experience:</strong> ${experience}</p>`;
  }
  if (role_title) {
    htmlContent += `<p><strong>Position:</strong> ${role_title}</p>`;
  }

  // Add main message
  htmlContent += `
        <p><strong>Message:</strong></p>
        <div style="background-color: white; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
  `;

  // Add additional content
  if (cover_letter) {
    htmlContent += `
        <p><strong>Cover Letter:</strong></p>
        <div style="background-color: white; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
          ${cover_letter.replace(/\n/g, '<br>')}
        </div>
    `;
  }
  if (resume) {
    htmlContent += `<p><strong>Resume:</strong> ${resume}</p>`;
  }

  htmlContent += `
      </div>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Submitted from: ${formType} form<br>
        Timestamp: ${new Date().toISOString()}
      </p>
    </div>
  `;

  return htmlContent;
}

// CSV Management endpoints
router.get('/csv/stats', async (req, res, next) => {
  try {
    const stats = await csvService.getCSVStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

router.get('/csv/:formType', async (req, res, next) => {
  try {
    const { formType } = req.params;
    const data = await csvService.readCSV(formType);
    res.status(200).json({
      success: true,
      formType: formType,
      count: data.length,
      data: data
    });
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Email service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
