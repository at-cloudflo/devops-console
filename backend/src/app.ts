import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';

import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import dashboardRoutes from './routes/dashboard.routes';
import devopsRoutes from './routes/devops.routes';
import mlopsRoutes from './routes/mlops.routes';
import configRoutes from './routes/config.routes';
import systemRoutes from './routes/system.routes';
import sseRoutes from './routes/sse.routes';
import { notFound, errorHandler } from './middleware/error.middleware';

const app = express();

// Security headers (relax CSP for POC local dev)
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  })
);

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session (cookie-based for POC; use Redis store in production)
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'poc-insecure-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devops', devopsRoutes);
app.use('/api/mlops', mlopsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/events', sseRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
