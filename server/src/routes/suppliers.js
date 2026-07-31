import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { suppliers, purchaseOrders } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeUgandanPhone } from '../utils/phone.js';

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().transform(val => val ? normalizeUgandanPhone(val) : ''),
  address: z.string().optional(),
  tin: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(suppliers).orderBy(suppliers.name);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.id));
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    // Get purchase history for this supplier
    const orders = await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.supplierId, req.params.id));

    res.json({ ...supplier, purchaseOrders: orders });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    const [supplier] = await db.insert(suppliers).values(data).returning();
    res.status(201).json(supplier);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = supplierSchema.partial().parse(req.body);
    const [updated] = await db.update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suppliers.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Supplier not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [deleted] = await db.delete(suppliers)
      .where(eq(suppliers.id, req.params.id))
      .returning({ id: suppliers.id });
    if (!deleted) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted' });
  } catch (err) { next(err); }
});

export default router;
