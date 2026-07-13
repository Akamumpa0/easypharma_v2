import { Router } from 'express';
import { eq, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { medicines } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const medicineSchema = z.object({
  generalName: z.string().min(1),
  scientificName: z.string().optional(),
  brandName: z.string().optional(),
  manufacturer: z.string().optional(),
  medicineCode: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  unitName: z.string().min(1),
  unitType: z.enum(['tablet', 'capsule', 'bottle', 'tube', 'injection', 'vial', 'ampoule',
    'packet', 'box', 'strip', 'carton', 'ml', 'litre', 'gram', 'kilogram']).optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  isControlled: z.boolean().optional(),
  requiresPrescription: z.boolean().optional(),
  reorderLevel: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(0).optional(),
});

// GET /api/medicines
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, category, controlled, prescription } = req.query;
    let conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(medicines.generalName, `%${search}%`),
          ilike(medicines.scientificName, `%${search}%`),
          ilike(medicines.brandName, `%${search}%`),
          ilike(medicines.manufacturer, `%${search}%`),
          ilike(medicines.medicineCode, `%${search}%`),
          ilike(medicines.barcode, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(medicines.category, category));
    }

    if (controlled === 'true') {
      conditions.push(eq(medicines.isControlled, true));
    }

    if (prescription === 'true') {
      conditions.push(eq(medicines.requiresPrescription, true));
    }

    const result = await db.select().from(medicines);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/medicines/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, req.params.id));
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    res.json(medicine);
  } catch (err) { next(err); }
});

// POST /api/medicines — admin only
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = medicineSchema.parse(req.body);
    const [newMedicine] = await db.insert(medicines).values(data).returning();
    res.status(201).json(newMedicine);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/medicines/:id — admin only
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = medicineSchema.partial().parse(req.body);
    const [updated] = await db.update(medicines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(medicines.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Medicine not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// DELETE /api/medicines/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [deleted] = await db.delete(medicines).where(eq(medicines.id, req.params.id)).returning({ id: medicines.id });
    if (!deleted) return res.status(404).json({ error: 'Medicine not found' });
    res.json({ message: 'Medicine deleted' });
  } catch (err) { next(err); }
});

export default router;
