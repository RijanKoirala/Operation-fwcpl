import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { db } from './models/database';
import { seedDatabase } from './seeds/demoData';

// Route imports
import authRoutes from './routes/auth.routes';
import branchRoutes from './routes/branches.routes';
import staffRoutes from './routes/staff.routes';
import taskRoutes from './routes/tasks.routes';
import connectionRoutes from './routes/connections.routes';
import ticketRoutes from './routes/tickets.routes';
import followUpRoutes from './routes/followups.routes';
import instructionRoutes from './routes/instructions.routes';
import targetRoutes from './routes/targets.routes';
import performanceRoutes from './routes/performance.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/reports.routes';
import notificationRoutes from './routes/notifications.routes';
import auditRoutes from './routes/audit.routes';
import searchRoutes from './routes/search.routes';
import settingRoutes from './routes/settings.routes';
import nocRoutes from './routes/noc.routes';
import adminRoutes from './routes/admin.routes';
import goodsItemRoutes from './routes/goodsItems.routes';
import goodsRequestRoutes from './routes/goodsRequests.routes';
import discussionRoutes from './routes/discussions.routes';
import podRoutes from './routes/pods.routes';

const app = express();

// Security & Parsing Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(config.upload.dir));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    organization: config.org.name,
    isPostgres: db.getIsPostgres(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/instructions', instructionRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/noc', nocRoutes);
app.use('/api/goods-items', goodsItemRoutes);
app.use('/api/goods-requests', goodsRequestRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/pods', podRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
  });
});

// Server Initialization
const startServer = async () => {
  try {
    console.log('⚡ Initializing FWCPL Database...');
    await db.init();
    
    // Only auto-seed demo data if explicitly requested via environment variable
    if (process.env.SEED_DEMO_DATA === 'true') {
      console.log('🌱 SEED_DEMO_DATA=true detected, running demo seed...');
      await seedDatabase(false);
    } else {
      console.log('🔒 Demo auto-seeding disabled. Running in clean operational mode.');
    }

    app.listen(config.port, () => {
      console.log(`🚀 FWCPL Operations API Server running on port ${config.port} [${config.env}]`);
      console.log(`📡 Health check available at: http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;
