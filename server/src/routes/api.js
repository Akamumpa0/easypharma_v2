import { Router } from 'express';
import { eq, or, ilike, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { apiUsers, medicines, stockMedicines, users } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── API User Management (admin only) ───────────────────────────────────────

const apiUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subscription: z.enum(['free_subscription', 'paid_subscription']).default('free_subscription'),
});

// GET /api/v1/api-users
router.get('/api-users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const all = await db.select().from(apiUsers);
    res.json(all);
  } catch (err) { next(err); }
});

// POST /api/v1/api-users
router.post('/api-users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = apiUserSchema.parse(req.body);
    const [existing] = await db.select().from(apiUsers).where(eq(apiUsers.email, data.email));
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const [newApiUser] = await db.insert(apiUsers).values(data).returning();
    res.status(201).json(newApiUser);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/v1/api-users/:id
router.patch('/api-users/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = apiUserSchema.partial().parse(req.body);
    const [updated] = await db.update(apiUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(apiUsers.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'API user not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// DELETE /api/v1/api-users/:id
router.delete('/api-users/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [deleted] = await db.delete(apiUsers).where(eq(apiUsers.id, req.params.id)).returning({ id: apiUsers.id });
    if (!deleted) return res.status(404).json({ error: 'API user not found' });
    res.json({ message: 'API user deleted' });
  } catch (err) { next(err); }
});

// ─── Public API (API key based) ─────────────────────────────────────────────

async function resolveApiUser(key, requiredSubs) {
  const [user] = await db.select().from(apiUsers).where(
    eq(apiUsers.apiKey, key)
  );
  if (!user || !user.isActive) return null;
  if (!requiredSubs.includes(user.subscription)) return null;
  return user;
}

const FREE_AND_PAID = ['free_subscription', 'paid_subscription'];
const PAID_ONLY     = ['paid_subscription'];

// GET /api/v1/:key/medicines
router.get('/:key/medicines', async (req, res, next) => {
  try {
    const apiUser = await resolveApiUser(req.params.key, FREE_AND_PAID);
    if (!apiUser) return res.status(403).json({ status: 'Forbidden', message: 'Invalid API key or insufficient subscription' });

    const all = await db.select().from(medicines);
    res.json(all);
  } catch (err) { next(err); }
});

// GET /api/v1/:key/search-medicine/:term
router.get('/:key/search-medicine/:term', async (req, res, next) => {
  try {
    const apiUser = await resolveApiUser(req.params.key, FREE_AND_PAID);
    if (!apiUser) return res.status(403).json({ status: 'Forbidden', message: 'Invalid API key or insufficient subscription' });

    const results = await db.select({
      id: medicines.id,
      generalName: medicines.generalName,
      scientificName: medicines.scientificName,
      description: medicines.description,
    }).from(medicines).where(
      or(
        ilike(medicines.generalName, `%${req.params.term}%`),
        ilike(medicines.scientificName, `%${req.params.term}%`)
      )
    );
    res.json(results);
  } catch (err) { next(err); }
});

// GET /api/v1/:key/pharmacies — paid only
router.get('/:key/pharmacies', async (req, res, next) => {
  try {
    const apiUser = await resolveApiUser(req.params.key, PAID_ONLY);
    if (!apiUser) return res.status(403).json({ status: 'Forbidden', message: 'Invalid API key or insufficient subscription' });

    const pharmacies = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      pharmacyName: users.pharmacyName,
      address: users.address,
      phone: users.phone,
    }).from(users).where(eq(users.role, 'pharmacist'));

    res.json(pharmacies);
  } catch (err) { next(err); }
});

// GET /api/v1/:key/quantity/:medicineId/:userId — paid only
router.get('/:key/quantity/:medicineId/:userId', async (req, res, next) => {
  try {
    const apiUser = await resolveApiUser(req.params.key, PAID_ONLY);
    if (!apiUser) return res.status(403).json({ status: 'Forbidden', message: 'Invalid API key or insufficient subscription' });

    const [stock] = await db.select({ quantity: stockMedicines.quantity })
      .from(stockMedicines)
      .where(and(
        eq(stockMedicines.medicineId, req.params.medicineId),
        eq(stockMedicines.userId, req.params.userId)
      ));

    if (!stock) return res.status(404).json({ status: 'Not Found', message: 'Stock record not found' });
    res.json({ quantity: stock.quantity });
  } catch (err) { next(err); }
});

// GET /api/v1/:key/selling-price/:medicineId/:userId — paid only
router.get('/:key/selling-price/:medicineId/:userId', async (req, res, next) => {
  try {
    const apiUser = await resolveApiUser(req.params.key, PAID_ONLY);
    if (!apiUser) return res.status(403).json({ status: 'Forbidden', message: 'Invalid API key or insufficient subscription' });

    const [stock] = await db.select({ sellingPrice: stockMedicines.sellingPrice })
      .from(stockMedicines)
      .where(and(
        eq(stockMedicines.medicineId, req.params.medicineId),
        eq(stockMedicines.userId, req.params.userId)
      ));

    if (!stock) return res.status(404).json({ status: 'Not Found', message: 'Stock record not found' });
    res.json({ sellingPrice: stock.sellingPrice });
  } catch (err) { next(err); }
});

export default router;
