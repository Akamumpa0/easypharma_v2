import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'pharmacist']).default('pharmacist'),
  pharmacyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  pharmacyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['admin', 'pharmacist']).optional(),
});

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      pharmacyName: users.pharmacyName,
      address: users.address,
      phone: users.phone,
      createdAt: users.createdAt,
    }).from(users);

    res.json(allUsers);
  } catch (err) { next(err); }
});

// POST /api/users — admin only
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const [existing] = await db.select().from(users).where(eq(users.email, data.email));
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [newUser] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: false,
      pharmacyName: data.pharmacyName,
      address: data.address,
      phone: data.phone,
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
    });

    res.status(201).json(newUser);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/users/:id — admin only
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const [updated] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [deleted] = await db.delete(users).where(eq(users.id, req.params.id)).returning({ id: users.id });
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});

export default router;
