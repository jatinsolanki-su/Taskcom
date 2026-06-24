import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load Environment Variables
dotenv.config();
console.log("CWD:", process.cwd());
console.log("ENV FILE TEST:");
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_NAME =", process.env.DB_NAME);

// Import DB Init and Router Paths
import { initDatabase } from './server/db.ts';
import authRoutes from './server/routes/auth.ts';
import ticketRoutes from './server/routes/tickets.ts';
import commentRoutes from './server/routes/comments.ts';
import userRoutes from './server/routes/users.ts';
import notificationRoutes from './server/routes/notifications.ts';
import { centralErrorHandler } from './server/middleware/security.ts';

async function bootstrap() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize DB pool or fallback file database
  await initDatabase();

  // Helmet Headers Configuration (including compatible Content Security Policy)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.run.app"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.run.app"],
        connectSrc: ["'self'", "ws:", "wss:", "https://*.run.app"],
        frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com", "https://*.run.app"],
      }
    }
  }));

  // Configure Secure CORS Policy
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173'
  ].filter(Boolean) as string[];

  app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://taskcom-ten.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

  // Basic Parser Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes (mounted BEFORE Vite middlewares)
  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Serve Frontend using Vite in Dev or Static files in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Central Error Handler (must be registered at the very end of routing tree)
  app.use(centralErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal crash during server bootstrap:', err);
  process.exit(1);
});
