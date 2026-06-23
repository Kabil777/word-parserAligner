import express, { type Express } from 'express';
import cors from 'cors';
import userRoutes from './routes/user.routes.js';
import documentRoutes from './routes/document.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import errorHandler from './middlewares/errorHandler.middleware.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analysis', analysisRoutes);

// Error Handling
app.use(errorHandler);

export default app;
