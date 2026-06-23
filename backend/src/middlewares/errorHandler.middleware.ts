import type { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err.message ?? err);

  // Multer / validation errors → 400
  if (
    err.code === 'LIMIT_FILE_SIZE' ||
    err.code === 'LIMIT_UNEXPECTED_FILE' ||
    err.message?.toLowerCase().includes('only .docx') ||
    err.message === 'User already exists' ||
    err.message === 'User not found'
  ) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  res.status(500).json({ success: false, error: err.message ?? 'Internal Server Error' });
};

export default errorHandler;
