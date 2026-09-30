const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ReportModel } = require('../models/report.model');

// Private storage directory outside public root
const storageDir = path.join(__dirname, '../../storage/reports');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// 1. Random Filename Generator & Private Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    // Generate secure cryptographically random UUID filename - NEVER trust user-provided filename on disk
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `rep_${crypto.randomUUID()}${ext}`;
    cb(null, randomName);
  }
});

// 2. MIME & Extension Whitelist Validator
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Extension validation
  if (!ReportModel.ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension: '${ext}'. Only PDF, JPG, and PNG files are accepted.`), false);
  }

  // MIME validation
  if (!ReportModel.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type: '${file.mimetype}'. Only application/pdf, image/jpeg, and image/png are allowed.`), false);
  }

  cb(null, true);
};

// 3. Multer instance with 10MB file size limit
const upload = multer({
  storage,
  limits: {
    fileSize: ReportModel.MAX_FILE_SIZE, // 10MB
    files: 1
  },
  fileFilter
});

// 4. Magic Bytes Content Inspection
const verifyMagicBytes = (filePath, mimeType) => {
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  // PDF magic bytes: %PDF (% = 0x25, P = 0x50, D = 0x44, F = 0x46)
  if (mimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // JPEG magic bytes: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    );
  }

  return false;
};

// Middleware error handler wrapper for multer errors
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `File size limit exceeded. Maximum allowed file size is 10 MB.`
        });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = {
  handleUpload,
  verifyMagicBytes,
  storageDir
};
