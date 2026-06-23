# Aligner Architecture Document

This document outlines the detailed class structures, Data Transfer Objects (DTOs) using Zod schemas, and the file structure for both the Express backend and the Next.js frontend for the "Aligner" application.

## 1. File Structure

### 1.1 Express Backend File Structure
```
aligner/
└── backend/
    ├── src/
    │   ├── config/             # Configuration files (env, database connection)
    │   ├── controllers/        # Express route controllers (ES6 Classes)
    │   ├── middlewares/        # Custom Express middlewares (error handling, auth, validation)
    │   ├── models/             # Database models/entities (e.g., Prisma, Mongoose)
    │   ├── routes/             # Express route definitions
    │   ├── schemas/            # Zod validation schemas (DTOs)
    │   ├── services/           # Business logic (ES6 Classes)
    │   ├── utils/              # Utility functions and helpers
    │   ├── app.js              # Express app setup
    │   └── server.js           # Server entry point
    ├── package.json
    └── tsconfig.json           # (if using TypeScript) / jsconfig.json
```

### 1.2 Next.js Frontend File Structure
```
aligner/
└── frontend/
    ├── src/
    │   ├── app/                # Next.js App Router
    │   │   ├── (auth)/         # Auth routes group
    │   │   ├── dashboard/      # Dashboard routes
    │   │   ├── layout.tsx      # Root layout
    │   │   └── page.tsx        # Home page
    │   ├── components/         # Reusable UI components
    │   │   ├── ui/             # Generic UI components (buttons, inputs)
    │   │   └── feature/        # Feature-specific components
    │   ├── hooks/              # Custom React hooks
    │   ├── lib/                # Library configurations (axios, etc.)
    │   ├── schemas/            # Zod schemas (Shared or duplicated from backend)
    │   ├── services/           # API call services
    │   ├── store/              # Global state management (Zustand/Redux)
    │   └── types/              # TypeScript definitions
    ├── public/                 # Static assets
    ├── package.json
    ├── next.config.mjs
    └── tailwind.config.ts
```

## 2. Backend Architecture (Controller-Service with ES6 Classes)

The backend follows a layered architecture to separate concerns.
- **Routes:** Map HTTP methods and endpoints to specific Controller methods.
- **Controllers:** Handle HTTP requests and responses. They extract data from requests, call the appropriate Service methods, and format the HTTP response.
- **Services:** Contain the core business logic. They process data and interact with the database (via Models).

### 2.1 Example: User Domain

#### 2.1.1 Zod Schemas (DTOs)

```javascript
// src/schemas/user.schema.js
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
    name: z.string().min(2, { message: 'Name is required' })
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid user ID' })
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    bio: z.string().optional()
  })
});
```

#### 2.1.2 Controller Class

```javascript
// src/controllers/user.controller.js
import UserService from '../services/user.service.js';

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  createUser = async (req, res, next) => {
    try {
      const userData = req.body;
      const newUser = await this.userService.createUser(userData);
      res.status(201).json({ success: true, data: newUser });
    } catch (error) {
      next(error);
    }
  };

  getUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  // Other methods: updateUser, deleteUser...
}

export default new UserController();
```

#### 2.1.3 Service Class

```javascript
// src/services/user.service.js
// Assuming a hypothetical Database model 'UserModel'
import UserModel from '../models/user.model.js'; 

class UserService {
  async createUser(userData) {
    // Business logic: Check if user exists, hash password, etc.
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash password here...
    
    const newUser = await UserModel.create(userData);
    return newUser;
  }

  async getUserById(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

export default UserService;
```

#### 2.1.4 Route Definition

```javascript
// src/routes/user.routes.js
import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import validateRequest from '../middlewares/validateRequest.middleware.js';
import { createUserSchema } from '../schemas/user.schema.js';

const router = Router();

router.post(
  '/', 
  validateRequest(createUserSchema), 
  UserController.createUser
);

router.get(
  '/:id', 
  UserController.getUser
);

export default router;
```

## 3. Frontend Architecture

The Next.js frontend will use functional components with hooks, leveraging the App Router. Forms will use `react-hook-form` integrated with `@hookform/resolvers/zod` for validation using the same Zod schemas as the backend.

### 3.1 API Service (Frontend)

```javascript
// src/services/api/userService.js
import axiosInstance from '../../lib/axiosInstance';

export const userService = {
  createUser: async (userData) => {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },
  getUser: async (id) => {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  }
};
```

### 3.2 Zod Schema Form Validation

```javascript
// Example in a Component (e.g., src/components/feature/RegisterForm.jsx)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema } from '../../schemas/user.schema'; // Import shared schema

// Note: Ensure the frontend schema matches the 'body' part of the backend schema
const formSchema = createUserSchema.shape.body;

export function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data) => {
    // Call userService.createUser(data)
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields here */}
    </form>
  );
}
```

## 4. Summary of Design Patterns
- **Backend**: Layered Architecture (Routes -> Validation Middleware -> Controller -> Service -> Model). Dependency Injection can be introduced in Controllers for Services if testing complexity increases, but instantiating Services in Controller constructors is sufficient for standard use cases.
- **Frontend**: Component-based architecture with separated API service layers to keep UI components pure and focused on rendering. State management will be handled locally where possible, and globally (e.g., Zustand) only when necessary.
- **Data Validation**: Centralized using Zod DTOs to ensure type safety and consistent validation rules across client and server boundaries.
