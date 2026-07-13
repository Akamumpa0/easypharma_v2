import { Router } from 'express';
import { eq, and, gte, sql, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stockMedicines, medicines, customerBillRecords, customerBills, suppliers } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/reorder — compute reorder recommendations for this pharmacist
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all stock items
    const stock = await db
      .select({
        id: stockMedicines.id,
        medicineId: stockMedicines.medicineId,
        quantity: stockMedicines.quantity,
        sellingPrice: stockMedicines.sellingPrice,
        buyingPrice: stockMedicines.buyingPrice,
        generalName: medicines.generalName,
        brandName: medicines.brandName,
        unitName: medicines.unitName,
        reorderLevel: medicines.reorderLevel,
        reorderQuantity: medicines.reorderQuantity,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(eq(stockMedicines.userId, userId));

    // Get last-30-day sales per medicine
    const salesData = await db
      .select({
        medicineId: customerBillRecords.medicineId,
        totalSold: sql`SUM(${customerBillRecords.quantity})`,
      })
      .from(customerBillRecords)
      .innerJoin(customerBills, eq(customerBillRecords.billId, customerBills.id))
      .where(and(
        eq(customerBills.userId, userId),
        gte(customerBills.createdAt, thirtyDaysAgo),
      ))
      .groupBy(customerBillRecords.medicineId);

    const salesMap = Object.fromEntries(
      salesData.map((s) => [s.medicineId, Number(s.totalSold)])
    );

    const recommendations = [];

    for (const item of stock) {
      const qty = Number(item.quantity);
      const reorderLevel = Number(item.reorderLevel ?? 10);
      const reorderQty = Number(item.reorderQuantity ?? 50);
      const monthlySales = salesMap[item.medicineId] || 0;
      const dailyAvg = monthlySales / 30;
      const leadTimeDays = 7; // default supplier lead time

      // Days of stock remaining
      const daysRemaining = dailyAvg > 0 ? Math.floor(qty / dailyAvg) : 999;

      // Suggested reorder: enough stock for 60 days minus current stock
      const targetStock = Math.ceil(dailyAvg * 60);
      const suggestedQty = Math.max(reorderQty, targetStock - qty);

      const needsReorder = qty <= reorderLevel || daysRemaining <= leadTimeDays + 3;

      if (needsReorder || qty <= reorderLevel) {
        recommendations.push({
          medicineId: item.medicineId,
          medicineName: item.generalName,
          brandName: item.brandName,
          unitName: item.unitName,
          currentStock: qty,
          reorderLevel,
          monthlySales,
          dailyAverage: Math.round(dailyAvg * 10) / 10,
          daysRemaining: daysRemaining === 999 ? null : daysRemaining,
          suggestedReorderQty: suggestedQty,
          estimatedCost: suggestedQty * Number(item.buyingPrice || 0),
          urgency: qty === 0 ? 'critical' : qty <= reorderLevel / 2 ? 'high' : 'medium',
        });
      }
    }

    // Sort by urgency
    const urgencyOrder = { critical: 0, high: 1, medium: 2 };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    res.json({
      count: recommendations.length,
      recommendations,
      totalEstimatedCost: Math.round(
        recommendations.reduce((s, r) => s + r.estimatedCost, 0) * 100
      ) / 100,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
