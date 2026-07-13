import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dailyReports, customerBills, customerBillRecords } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/daily — get daily reports for current pharmacist
router.get('/daily', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let conditions = [eq(dailyReports.userId, req.user.id)];

    if (from) conditions.push(gte(dailyReports.date, new Date(from)));
    if (to)   conditions.push(lte(dailyReports.date, new Date(to)));

    const reports = await db.select().from(dailyReports)
      .where(and(...conditions))
      .orderBy(dailyReports.date);

    res.json(reports);
  } catch (err) { next(err); }
});

// GET /api/reports/summary — today's summary
router.get('/summary', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [report] = await db.select().from(dailyReports)
      .where(and(eq(dailyReports.userId, req.user.id), eq(dailyReports.date, today)));

    res.json(report || {
      totalSales: '0',
      totalCost: '0',
      totalProfit: '0',
      billCount: 0,
      date: today,
    });
  } catch (err) { next(err); }
});

export default router;
