// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'EmailError') {
    statusCode = 400;
    message = 'Email Error';
    details = err.message;
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Email service unavailable';
    details = 'Unable to connect to email server';
  } else if (err.code === 'EAUTH') {
    statusCode = 401;
    message = 'Email authentication failed';
    details = 'Invalid email credentials';
  } else if (err.message && err.message.includes('validation failed')) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.message;
  } else if (err.message && err.message.includes('Failed to send email')) {
    statusCode = 500;
    message = 'Email sending failed';
    details = err.message;
  }

  // In development, include stack trace
  const response = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  if (details) {
    response.details = details;
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

// Custom error class for email errors
class EmailError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'EmailError';
    this.statusCode = statusCode;
  }
}

// Custom error class for validation errors
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

module.exports = {
  errorHandler,
  EmailError,
  ValidationError
};
