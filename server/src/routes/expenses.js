import { Router } from 'express';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const expenseSchema = z.object({
  type: z.enum(['rent', 'electricity', 'water', 'transport', 'internet',
    'repairs', 'salary', 'maintenance', 'supplies', 'marketing', 'insurance', 'miscellaneous']),
  description: z.string().optional(),
  amount: z.string(),
  expenseDate: z.string(),
});

// GET /api/expenses
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const conditions = [eq(expenses.userId, req.user.id)];

    if (from) conditions.push(gte(expenses.expenseDate, new Date(from)));
    if (to)   conditions.push(lte(expenses.expenseDate, new Date(to)));
    if (type) conditions.push(eq(expenses.type, type));

    const rows = await db.select().from(expenses)
      .where(and(...conditions))
      .orderBy(expenses.expenseDate);

    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/expenses/summary
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const conditions = [eq(expenses.userId, req.user.id)];
    if (from) conditions.push(gte(expenses.expenseDate, new Date(from)));
    if (to)   conditions.push(lte(expenses.expenseDate, new Date(to)));

    const byType = await db
      .select({
        type: expenses.type,
        total: sql`SUM(${expenses.amount})`,
        count: sql`COUNT(*)`,
      })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(expenses.type)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    const grandTotal = byType.reduce((s, r) => s + Number(r.total), 0);

    res.json({
      byType,
      grandTotal: Math.round(grandTotal * 100) / 100,
    });
  } catch (err) { next(err); }
});

// POST /api/expenses
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);
    const [expense] = await db.insert(expenses).values({
      userId: req.user.id,
      createdBy: req.user.id,
      ...data,
      expenseDate: new Date(data.expenseDate),
    }).returning();
    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/expenses/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = expenseSchema.partial().parse(req.body);
    const [updated] = await db.update(expenses)
      .set({ ...data, expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined })
      .where(and(eq(expenses.id, req.params.id), eq(expenses.userId, req.user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const [deleted] = await db.delete(expenses)
      .where(and(eq(expenses.id, req.params.id), eq(expenses.userId, req.user.id)))
      .returning({ id: expenses.id });
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
});

export default router;
