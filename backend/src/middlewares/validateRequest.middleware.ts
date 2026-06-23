import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.issues.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      return next(error);
    }
  };
};

export default validateRequest;
