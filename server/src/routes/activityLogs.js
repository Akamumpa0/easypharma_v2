import { Router } from 'express';
import { eq, and, gte, lte, ilike, or, desc } from 'drizzle-orm';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { db } from '../db/index.js';
import { activityLogs, users } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/activity-logs
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { userId, module, action, from, to, q, page = 1, limit = 50 } = req.query;
    const conditions = [];

    if (userId) conditions.push(eq(activityLogs.userId, userId));
    if (module) conditions.push(eq(activityLogs.module, module));
    if (action) conditions.push(ilike(activityLogs.action, `%${action}%`));
    if (from)   conditions.push(gte(activityLogs.createdAt, new Date(from)));
    if (to)     conditions.push(lte(activityLogs.createdAt, new Date(to)));
    if (q)      conditions.push(or(
      ilike(activityLogs.description, `%${q}%`),
      ilike(activityLogs.action,      `%${q}%`),
    ));

    const rows = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        activityType: activityLogs.activityType,
        module: activityLogs.module,
        action: activityLogs.action,
        description: activityLogs.description,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.createdAt))
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));

    res.json({ logs: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/activity-logs/export?format=csv
router.get('/export', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await db
      .select({
        Date: activityLogs.createdAt,
        User: users.email,
        Module: activityLogs.module,
        Action: activityLogs.action,
        Description: activityLogs.description,
        IP: activityLogs.ipAddress,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10000);

    const csv = csvStringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

export default router;
