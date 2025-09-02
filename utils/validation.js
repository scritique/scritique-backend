const Joi = require('joi');

// Email validation schema
const emailSchema = Joi.object({
  to: Joi.alternatives().try(
    Joi.string().email().required(),
    Joi.array().items(Joi.string().email()).min(1).required()
  ).required(),
  subject: Joi.string().min(1).max(200).required(),
  text: Joi.string().optional(),
  html: Joi.string().optional(),
  cc: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ).optional(),
  bcc: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ).optional(),
  attachments: Joi.array().items(
    Joi.object({
      filename: Joi.string().required(),
      content: Joi.alternatives().try(
        Joi.string(),
        Joi.binary()
      ).required(),
      contentType: Joi.string().optional()
    })
  ).optional()
});

// Validation function for email data
function validateEmailData(emailData) {
  const { error, value } = emailSchema.validate(emailData, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  // Additional validation: at least one of text or html must be provided
  if (!value.text && !value.html) {
    return {
      isValid: false,
      errors: ['Either text or html content must be provided']
    };
  }
  
  return {
    isValid: true,
    data: value
  };
}

module.exports = {
  validateEmailData
};
