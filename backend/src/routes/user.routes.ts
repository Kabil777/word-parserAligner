import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import validateRequest from '../middlewares/validateRequest.middleware.js';
import { createUserSchema, updateUserSchema, loginSchema } from '../schemas/user.schema.js';

const router = Router();

router.post(
  '/', 
  validateRequest(createUserSchema), 
  UserController.createUser
);

router.post(
  '/login',
  validateRequest(loginSchema),
  UserController.loginUser
);

router.get(
  '/', 
  UserController.getAllUsers
);

router.get(
  '/:id', 
  UserController.getUser
);

router.put(
  '/:id',
  validateRequest(updateUserSchema),
  UserController.updateUser
);

router.delete(
  '/:id',
  UserController.deleteUser
);

export default router;
