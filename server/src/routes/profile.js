import { Router } from 'express';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, activityLogs } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';
import { normalizeUgandanPhone } from '../utils/phone.js';

const router = Router();

const updateProfileSchema = z.object({
  firstName:    z.string().min(1).optional(),
  lastName:     z.string().min(1).optional(),
  phone:        z.string().optional().transform(val => val ? normalizeUgandanPhone(val) : ''),
  pharmacyName: z.string().optional(),
  address:      z.string().optional(),
  tin:          z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

// GET /api/profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      phone: users.phone,
      pharmacyName: users.pharmacyName,
      address: users.address,
      tin: users.tin,
      profilePhoto: users.profilePhoto,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      passwordChangedAt: users.passwordChangedAt,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, req.user.id));

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Recent activity
    const recentActivity = await db.select().from(activityLogs)
      .where(eq(activityLogs.userId, req.user.id))
      .orderBy(activityLogs.createdAt)
      .limit(10);
    recentActivity.reverse();

    res.json({ ...user, recentActivity });
  } catch (err) { next(err); }
});

// PATCH /api/profile
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const [updated] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id, email: users.email, firstName: users.firstName,
        lastName: users.lastName, phone: users.phone, pharmacyName: users.pharmacyName,
        address: users.address, tin: users.tin,
      });

    await logActivity({ userId: req.user.id, activityType: 'update', module: 'profile', action: 'update_profile', description: 'Updated profile', req });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// POST /api/profile/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await logActivity({ userId: req.user.id, activityType: 'update', module: 'profile', action: 'change_password', description: 'Changed password', req });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

export default router;
