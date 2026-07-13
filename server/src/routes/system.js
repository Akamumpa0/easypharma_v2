import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { backups, users, activityLogs } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';
import ExcelJS from 'exceljs';
import { stringify as csvStringify } from 'csv-stringify/sync';
import fs from 'fs/promises';
import path from 'path';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/system/health — DB, API, storage status
router.get('/health', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    // Test DB
    let dbStatus = 'ok', dbLatency = 0;
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    // Storage
    let storageInfo = { used: 0, files: 0 };
    try {
      const uploadDir = 'uploads';
      const files = await fs.readdir(uploadDir, { recursive: true }).catch(() => []);
      let totalSize = 0;
      for (const f of files) {
        try {
          const stat = await fs.stat(path.join(uploadDir, f));
          if (stat.isFile()) { totalSize += stat.size; storageInfo.files++; }
        } catch {}
      }
      storageInfo.used = totalSize;
      storageInfo.usedMB = (totalSize / 1024 / 1024).toFixed(2);
    } catch {}

    // Active users (last 24h based on activity logs)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeLogsResult = await db.execute(
      sql`SELECT COUNT(DISTINCT user_id) as cnt FROM activity_logs WHERE created_at >= ${dayAgo}`
    );
    const activeUsers = Number(activeLogsResult.rows?.[0]?.cnt || 0);

    // Latest backup
    const [latestBackup] = await db.select().from(backups)
      .orderBy(desc(backups.createdAt))
      .limit(1);

    // User count
    const userCountResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM users`);
    const totalUsers = Number(userCountResult.rows?.[0]?.cnt || 0);

    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      services: {
        api:      { status: 'ok' },
        database: { status: dbStatus, latencyMs: dbLatency },
        storage:  { status: 'ok', ...storageInfo },
      },
      metrics: {
        totalUsers,
        activeUsers,
        latestBackup: latestBackup
          ? { date: latestBackup.createdAt, filename: latestBackup.filename, size: latestBackup.fileSize }
          : null,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/system/backups — list backups
router.get('/backups', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const list = await db.select().from(backups).orderBy(desc(backups.createdAt));
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/system/backup — create backup
router.post('/backup', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `easypharma-backup-${timestamp}.xlsx`;

    // Export all tables to Excel workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'EasyPharma';
    wb.created = new Date();

    // Import all schema tables
    const { medicines, stockMedicines, customerBills, customerBillRecords,
      suppliers, expenses, users: usersTable } = await import('../db/schema.js');

    const tablesToBackup = [
      { name: 'Users',      table: usersTable,          exclude: ['passwordHash'] },
      { name: 'Medicines',  table: medicines },
      { name: 'Stock',      table: stockMedicines },
      { name: 'Sales',      table: customerBills },
      { name: 'SaleItems',  table: customerBillRecords },
      { name: 'Suppliers',  table: suppliers },
      { name: 'Expenses',   table: expenses },
    ];

    for (const { name, table, exclude = [] } of tablesToBackup) {
      try {
        const rows = await db.select().from(table);
        if (rows.length === 0) continue;
        const ws = wb.addWorksheet(name);
        const keys = Object.keys(rows[0]).filter(k => !exclude.includes(k));
        ws.columns = keys.map(k => ({ header: k, key: k, width: 20 }));
        ws.getRow(1).font = { bold: true };
        rows.forEach(row => {
          const r = {};
          keys.forEach(k => r[k] = row[k]);
          ws.addRow(r);
        });
      } catch (e) {
        console.error(`Backup sheet ${name} failed:`, e.message);
      }
    }

    // Save to backup dir
    const backupDir = path.join('uploads', 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const filePath = path.join(backupDir, filename);
    await wb.xlsx.writeFile(filePath);

    const stat = await fs.stat(filePath);

    const [backup] = await db.insert(backups).values({
      filename,
      fileSize: stat.size,
      filePath: `/backups/${filename}`,
      status: 'completed',
      createdBy: req.user.id,
    }).returning();

    await logActivity({ userId: req.user.id, activityType: 'backup', module: 'system', action: 'create_backup', description: `Backup created: ${filename}`, req });

    res.json({ ...backup, downloadUrl: `/uploads/backups/${filename}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/system/settings
router.get('/settings', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { systemSettings } = await import('../db/schema.js');
    const settings = await db.select().from(systemSettings);
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json(map);
  } catch (err) { next(err); }
});

// PATCH /api/system/settings
router.patch('/settings', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { systemSettings } = await import('../db/schema.js');
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await db.insert(systemSettings)
        .values({ key, value: String(value), updatedBy: req.user.id })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: String(value), updatedBy: req.user.id, updatedAt: new Date() },
        });
    }
    res.json({ message: 'Settings updated', count: entries.length });
  } catch (err) { next(err); }
});

export default router;
