import { Router } from 'express';
import { eq, and, lte, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications, stockMedicines, medicines } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — paginated list
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(notifications.createdAt)
      .limit(100);

    // newest first
    rows.reverse();

    const unreadCount = rows.filter(n => !n.isRead).length;
    res.json({ notifications: rows, unreadCount });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user.id)));
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user.id));
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

// POST /api/notifications/check-stock — scan for low stock & expiry alerts
router.post('/check-stock', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const today = new Date();

    const stock = await db
      .select({
        medicineId: stockMedicines.medicineId,
        quantity: stockMedicines.quantity,
        expiryDate: stockMedicines.expiryDate,
        medicineName: medicines.generalName,
        reorderLevel: medicines.reorderLevel,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(eq(stockMedicines.userId, userId));

    const created = [];

    for (const item of stock) {
      const qty = Number(item.quantity);
      const level = Number(item.reorderLevel ?? 10);

      // Low stock alert
      if (qty <= level && qty > 0) {
        const [existing] = await db.select().from(notifications).where(and(
          eq(notifications.userId, userId),
          eq(notifications.referenceId, item.medicineId),
          eq(notifications.type, 'low_stock'),
          eq(notifications.isRead, false),
        ));
        if (!existing) {
          await db.insert(notifications).values({
            userId,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${item.medicineName} has only ${qty} units remaining (reorder level: ${level})`,
            referenceId: item.medicineId,
          });
          created.push({ type: 'low_stock', medicine: item.medicineName });
        }
      }

      // Out of stock
      if (qty === 0) {
        const [existing] = await db.select().from(notifications).where(and(
          eq(notifications.userId, userId),
          eq(notifications.referenceId, item.medicineId),
          eq(notifications.type, 'low_stock'),
          eq(notifications.isRead, false),
        ));
        if (!existing) {
          await db.insert(notifications).values({
            userId,
            type: 'low_stock',
            title: 'Out of Stock',
            message: `${item.medicineName} is out of stock`,
            referenceId: item.medicineId,
          });
          created.push({ type: 'out_of_stock', medicine: item.medicineName });
        }
      }

      // Near expiry (within 30 days)
      if (item.expiryDate) {
        const expiry = new Date(item.expiryDate);
        if (expiry <= thirtyDays && expiry > today) {
          const [existing] = await db.select().from(notifications).where(and(
            eq(notifications.userId, userId),
            eq(notifications.referenceId, item.medicineId),
            eq(notifications.type, 'near_expiry'),
            eq(notifications.isRead, false),
          ));
          if (!existing) {
            const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            await db.insert(notifications).values({
              userId,
              type: 'near_expiry',
              title: 'Near Expiry',
              message: `${item.medicineName} expires in ${daysLeft} day(s) on ${expiry.toLocaleDateString()}`,
              referenceId: item.medicineId,
            });
            created.push({ type: 'near_expiry', medicine: item.medicineName });
          }
        }

        // Expired
        if (expiry <= today) {
          const [existing] = await db.select().from(notifications).where(and(
            eq(notifications.userId, userId),
            eq(notifications.referenceId, item.medicineId),
            eq(notifications.type, 'expired'),
            eq(notifications.isRead, false),
          ));
          if (!existing) {
            await db.insert(notifications).values({
              userId,
              type: 'expired',
              title: 'Expired Medicine',
              message: `${item.medicineName} expired on ${expiry.toLocaleDateString()} — remove from stock`,
              referenceId: item.medicineId,
            });
            created.push({ type: 'expired', medicine: item.medicineName });
          }
        }
      }
    }

    res.json({ checked: stock.length, alertsCreated: created.length, alerts: created });
  } catch (err) { next(err); }
});

// Helper exported so billing/returns can create notifications
export async function createNotification(userId, type, title, message, referenceId = null) {
  try {
    await db.insert(notifications).values({ userId, type, title, message, referenceId });
  } catch (e) {
    console.error('Failed to create notification:', e.message);
  }
}

export default router;
