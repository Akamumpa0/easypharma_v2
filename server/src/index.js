import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './utils/swagger.js';
import logger from './utils/logger.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import medicineRoutes from './routes/medicines.js';
import stockRoutes from './routes/stock.js';
import billingRoutes from './routes/billing.js';
import reportsRoutes from './routes/reports.js';
import apiRoutes from './routes/api.js';
import barcodeRoutes from './routes/barcodes.js';
import imageRoutes from './routes/images.js';
import unitRoutes from './routes/units.js';
import valuationRoutes from './routes/valuation.js';
import analyticsRoutes from './routes/analytics.js';
import reorderRoutes from './routes/reorder.js';
import returnsRoutes from './routes/returns.js';
import reconciliationRoutes from './routes/reconciliation.js';
import receiptsRoutes from './routes/receipts.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import supplierRoutes from './routes/suppliers.js';
import expenseRoutes from './routes/expenses.js';
import searchRoutes from './routes/search.js';
import importExportRoutes from './routes/importExport.js';
import notificationRoutes from './routes/notifications.js';
import activityLogRoutes from './routes/activityLogs.js';
import profileRoutes from './routes/profile.js';
import systemRoutes from './routes/system.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // disabled so Swagger UI loads
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Request logging (morgan → winston) ───────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── API Documentation ─────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'EasyPharma API Docs',
  customCss: '.swagger-ui .topbar { background-color: #16a34a; }',
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// ── App routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/medicines',      medicineRoutes);
app.use('/api/stock',          stockRoutes);
app.use('/api/billing',        billingRoutes);
app.use('/api/reports',        reportsRoutes);
app.use('/api/barcodes',       barcodeRoutes);
app.use('/api/images',         imageRoutes);
app.use('/api/units',          unitRoutes);
app.use('/api/valuation',      valuationRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/reorder',        reorderRoutes);
app.use('/api/returns',        returnsRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/receipts',       receiptsRoutes);
app.use('/api/purchase-orders',purchaseOrderRoutes);
app.use('/api/suppliers',      supplierRoutes);
app.use('/api/expenses',       expenseRoutes);
app.use('/api/search',         searchRoutes);
app.use('/api/export',         importExportRoutes);
app.use('/api/import',         importExportRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/activity-logs',  activityLogRoutes);
app.use('/api/profile',        profileRoutes);
app.use('/api/system',         systemRoutes);

// ── External public API ───────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${status} ${message}`, {
    method: req.method,
    path: req.path,
    stack: err.stack,
    userId: req.user?.id,
  });

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  logger.info(`EasyPharma server running on port ${PORT}`);
  logger.info(`API docs available at http://localhost:${PORT}/api/docs`);
});
