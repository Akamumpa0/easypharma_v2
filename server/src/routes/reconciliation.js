import { Router } from 'express';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { stockMedicines, medicines, stockMovements } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/reconciliation/movements/:medicineId — full movement timeline
router.get('/movements/:medicineId', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const conditions = [
      eq(stockMovements.userId, req.user.id),
      eq(stockMovements.medicineId, req.params.medicineId),
    ];

    if (from) conditions.push(gte(stockMovements.createdAt, new Date(from)));
    if (to)   conditions.push(lte(stockMovements.createdAt, new Date(to)));

    const movements = await db.select().from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt));

    res.json(movements);
  } catch (err) { next(err); }
});

// GET /api/reconciliation/movements — all movements for user
router.get('/movements', requireAuth, async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const conditions = [eq(stockMovements.userId, req.user.id)];

    if (from) conditions.push(gte(stockMovements.createdAt, new Date(from)));
    if (to)   conditions.push(lte(stockMovements.createdAt, new Date(to)));
    if (type) conditions.push(eq(stockMovements.movementType, type));

    const movements = await db
      .select({
        id: stockMovements.id,
        medicineId: stockMovements.medicineId,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        batchNumber: stockMovements.batchNumber,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        medicineName: medicines.generalName,
      })
      .from(stockMovements)
      .innerJoin(medicines, eq(stockMovements.medicineId, medicines.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(500);

    res.json(movements);
  } catch (err) { next(err); }
});

// GET /api/reconciliation/daily — opening/closing stock snapshot for today
router.get('/daily', requireAuth, async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

    // Current stock
    const currentStock = await db
      .select({
        medicineId: stockMedicines.medicineId,
        currentQty: stockMedicines.quantity,
        medicineName: medicines.generalName,
        unitName: medicines.unitName,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(eq(stockMedicines.userId, req.user.id));

    // Movements during the day
    const todayMovements = await db.select().from(stockMovements).where(and(
      eq(stockMovements.userId, req.user.id),
      gte(stockMovements.createdAt, dayStart),
      lte(stockMovements.createdAt, dayEnd),
    ));

    // Compute opening stock = currentStock - net today's movements
    const movementByMedicine = {};
    for (const m of todayMovements) {
      movementByMedicine[m.medicineId] = (movementByMedicine[m.medicineId] || 0) + m.quantity;
    }

    const reconciliation = currentStock.map((s) => {
      const netMovement = movementByMedicine[s.medicineId] || 0;
      const openingStock = s.currentQty - netMovement;
      const variance = s.currentQty - openingStock;

      return {
        medicineId: s.medicineId,
        medicineName: s.medicineName,
        unitName: s.unitName,
        openingStock,
        closingStock: s.currentQty,
        netMovement,
        variance,
        status: variance > 0 ? 'gain' : variance < 0 ? 'loss' : 'balanced',
      };
    });

    const totalGain = reconciliation
      .filter((r) => r.variance > 0)
      .reduce((s, r) => s + r.variance, 0);
    const totalLoss = reconciliation
      .filter((r) => r.variance < 0)
      .reduce((s, r) => s + Math.abs(r.variance), 0);

    res.json({
      date: dateStr,
      items: reconciliation,
      summary: {
        totalItems: reconciliation.length,
        totalGain,
        totalLoss,
        balanced: reconciliation.filter((r) => r.variance === 0).length,
      },
    });
  } catch (err) { next(err); }
});

export default router;
