import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { db } from '../db/index.js';
import {
  purchaseOrders, purchaseOrderItems, medicines, stockMedicines,
  stockMovements, batches,
} from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

const poSchema = z.object({
  supplierId: z.string().uuid(),
  notes: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.string(),
  })).min(1),
});

// GET /api/purchase-orders
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.userId, req.user.id))
      .orderBy(purchaseOrders.createdAt);
    res.json(orders);
  } catch (err) { next(err); }
});

// GET /api/purchase-orders/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const [order] = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, req.params.id), eq(purchaseOrders.userId, req.user.id)));
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await db.select({
      id: purchaseOrderItems.id,
      medicineId: purchaseOrderItems.medicineId,
      quantity: purchaseOrderItems.quantity,
      unitPrice: purchaseOrderItems.unitPrice,
      subtotal: purchaseOrderItems.subtotal,
      medicineName: medicines.generalName,
    }).from(purchaseOrderItems)
      .innerJoin(medicines, eq(purchaseOrderItems.medicineId, medicines.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

    res.json({ ...order, items });
  } catch (err) { next(err); }
});

// POST /api/purchase-orders — create draft
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = poSchema.parse(req.body);

    const total = data.items.reduce(
      (s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0
    );

    const [order] = await db.insert(purchaseOrders).values({
      userId: req.user.id,
      supplierId: data.supplierId,
      orderNumber: `PO-${nanoid()}`,
      status: 'draft',
      totalAmount: total.toFixed(2),
      notes: data.notes,
    }).returning();

    for (const item of data.items) {
      const subtotal = (parseFloat(item.unitPrice) * item.quantity).toFixed(2);
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: order.id,
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      });
    }

    const items = await db.select().from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

    res.status(201).json({ ...order, items });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/purchase-orders/:id/status — advance status
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'pending', 'approved', 'ordered', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [order] = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, req.params.id), eq(purchaseOrders.userId, req.user.id)));
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updates = {
      status,
      updatedAt: new Date(),
      orderedAt: status === 'ordered' ? new Date() : order.orderedAt,
      receivedAt: status === 'received' ? new Date() : order.receivedAt,
    };

    // When received: automatically update stock
    if (status === 'received') {
      const items = await db.select().from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

      for (const item of items) {
        const [stock] = await db.select().from(stockMedicines).where(and(
          eq(stockMedicines.medicineId, item.medicineId),
          eq(stockMedicines.userId, req.user.id),
        ));

        if (stock) {
          await db.update(stockMedicines)
            .set({ quantity: stock.quantity + item.quantity, updatedAt: new Date() })
            .where(eq(stockMedicines.id, stock.id));
        } else {
          await db.insert(stockMedicines).values({
            userId: req.user.id,
            medicineId: item.medicineId,
            quantity: item.quantity,
            sellingPrice: item.unitPrice,
            buyingPrice: item.unitPrice,
          });
        }

        // Add batch record
        const [med] = await db.select({ generalName: medicines.generalName })
          .from(medicines).where(eq(medicines.id, item.medicineId));

        await db.insert(batches).values({
          userId: req.user.id,
          medicineId: item.medicineId,
          batchNumber: `BATCH-${order.orderNumber}-${item.id.slice(0, 6).toUpperCase()}`,
          quantity: item.quantity,
          buyingPrice: item.unitPrice,
          sellingPrice: item.unitPrice,
          supplierId: order.supplierId,
        });

        await db.insert(stockMovements).values({
          userId: req.user.id,
          medicineId: item.medicineId,
          movementType: 'purchased',
          quantity: item.quantity,
          referenceId: order.id,
          notes: `Received via PO ${order.orderNumber}`,
        });
      }
    }

    const [updated] = await db.update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, order.id))
      .returning();

    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/purchase-orders/:id — only drafts can be deleted
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const [order] = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, req.params.id), eq(purchaseOrders.userId, req.user.id)));

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft orders can be deleted' });
    }

    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, req.params.id));
    res.json({ message: 'Order deleted' });
  } catch (err) { next(err); }
});

export default router;
