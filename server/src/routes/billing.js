import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { customerBills, customerBillRecords, stockMedicines, dailyReports, stockMovements } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const billItemSchema = z.object({
  medicineId: z.string().uuid(),
  medicineName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
});

const createBillSchema = z.object({
  customerName: z.string().optional(),
  items: z.array(billItemSchema).min(1),
});

// GET /api/billing — get all bills for current pharmacist
router.get('/', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const bills = await db.select().from(customerBills)
      .where(eq(customerBills.userId, req.user.id))
      .orderBy(customerBills.createdAt);
    res.json(bills);
  } catch (err) { next(err); }
});

// GET /api/billing/:id — get bill with line items
router.get('/:id', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const [bill] = await db.select().from(customerBills)
      .where(and(eq(customerBills.id, req.params.id), eq(customerBills.userId, req.user.id)));
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const items = await db.select().from(customerBillRecords)
      .where(eq(customerBillRecords.billId, bill.id));

    res.json({ ...bill, items });
  } catch (err) { next(err); }
});

// POST /api/billing — create a new bill (POS checkout)
router.post('/', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const data = createBillSchema.parse(req.body);

    // Verify sufficient stock exists for all items
    for (const item of data.items) {
      const [stockItem] = await db.select().from(stockMedicines)
        .where(and(
          eq(stockMedicines.medicineId, item.medicineId),
          eq(stockMedicines.userId, req.user.id)
        ));
      if (!stockItem || stockItem.quantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${item.medicineName}". Available: ${stockItem ? stockItem.quantity : 0}, Requested: ${item.quantity}`
        });
      }
    }

    // Calculate total
    const total = data.items.reduce((sum, item) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    // Create bill
    const [bill] = await db.insert(customerBills).values({
      userId: req.user.id,
      customerName: data.customerName,
      totalAmount: total.toFixed(2),
    }).returning();

    let totalCost = 0;
    // Insert line items and deduct stock
    for (const item of data.items) {
      const subtotal = (parseFloat(item.unitPrice) * item.quantity).toFixed(2);

      await db.insert(customerBillRecords).values({
        billId: bill.id,
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      });

      // Deduct from stock & compute COGS
      const [stockItem] = await db.select().from(stockMedicines)
        .where(and(
          eq(stockMedicines.medicineId, item.medicineId),
          eq(stockMedicines.userId, req.user.id)
        ));

      if (stockItem) {
        const newQty = Math.max(0, stockItem.quantity - item.quantity);
        await db.update(stockMedicines)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(stockMedicines.id, stockItem.id));

        totalCost += (parseFloat(stockItem.buyingPrice || '0') * item.quantity);
      }

      // Record stock movement for audit & daily reconciliation
      await db.insert(stockMovements).values({
        userId: req.user.id,
        medicineId: item.medicineId,
        movementType: 'sold',
        quantity: -item.quantity,
        referenceId: bill.id,
        notes: `Sold via POS checkout (Bill #${bill.id.slice(0, 8)})`,
      });
    }

    // Update daily report with COGS and profit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingReport] = await db.select().from(dailyReports)
      .where(and(eq(dailyReports.userId, req.user.id), eq(dailyReports.date, today)));

    if (existingReport) {
      const newSales = parseFloat(existingReport.totalSales) + total;
      const newCost = parseFloat(existingReport.totalCost || '0') + totalCost;
      const newProfit = newSales - newCost;

      await db.update(dailyReports).set({
        totalSales: newSales.toFixed(2),
        totalCost: newCost.toFixed(2),
        totalProfit: newProfit.toFixed(2),
        billCount: existingReport.billCount + 1,
      }).where(eq(dailyReports.id, existingReport.id));
    } else {
      const profit = total - totalCost;
      await db.insert(dailyReports).values({
        userId: req.user.id,
        date: today,
        totalSales: total.toFixed(2),
        totalCost: totalCost.toFixed(2),
        totalProfit: profit.toFixed(2),
        billCount: 1,
      });
    }

    const items = await db.select().from(customerBillRecords).where(eq(customerBillRecords.billId, bill.id));
    res.status(201).json({ ...bill, items });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

export default router;
