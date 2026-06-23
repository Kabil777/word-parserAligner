import multer from 'multer';
import path from 'path';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = file.mimetype === DOCX_MIME
      || file.mimetype === 'application/zip'
      || file.mimetype === 'application/octet-stream';
    const extOk  = ext === '.docx';

    if (mimeOk && extOk) {
      cb(null, true);
    } else if (extOk) {
      // Trust the extension if browser reports a generic MIME
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
