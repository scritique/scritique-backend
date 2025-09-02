const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const defaultUploadDir = path.join(__dirname, '../uploads');
    const configuredDir = process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim() !== ''
      ? process.env.UPLOADS_DIR
      : defaultUploadDir;
    const uploadDir = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(configuredDir);
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    
    const filename = `${nameWithoutExt}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  // Allow common document formats
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf'
  ];
  
  // Allow common file extensions
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file per request
  }
});

// Middleware for handling file upload errors
const handleFileUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 5MB'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one file is allowed per request'
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
        message: 'Unexpected file field in request'
      });
    }
  } else if (error && typeof error.message === 'string' && error.message.includes('File type not allowed')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  // Generic file upload error
  return res.status(500).json({
    error: 'File upload failed',
    message: 'An error occurred while uploading the file'
  });
};

// Clean up uploaded files after email is sent
const cleanupUploadedFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Uploaded file cleaned up: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to clean up uploaded file: ${filePath}`, error.message);
    }
  }
};

module.exports = {
  upload,
  handleFileUploadError,
  cleanupUploadedFile
};
