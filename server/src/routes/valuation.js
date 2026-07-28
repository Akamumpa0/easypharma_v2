import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stockMedicines, medicines, batches } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  valuateInventory,
  fifoValuation,
  weightedAverageValuation,
  fifoCOGS,
} from '../utils/stockValuation.js';

const router = Router();

// GET /api/valuation?method=FIFO|WeightedAverage
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const method = req.query.method === 'WeightedAverage' ? 'WeightedAverage' : 'FIFO';
    const userId = req.user.id;

    // Fetch all stock for this pharmacist with medicine info
    const stock = await db
      .select({
        id: stockMedicines.id,
        medicineId: stockMedicines.medicineId,
        quantity: stockMedicines.quantity,
        sellingPrice: stockMedicines.sellingPrice,
        buyingPrice: stockMedicines.buyingPrice,
        createdAt: stockMedicines.createdAt,
        generalName: medicines.generalName,
        brandName: medicines.brandName,
        unitName: medicines.unitName,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(eq(stockMedicines.userId, userId));

    // For each stock item, fetch its batches
    const stockWithBatches = await Promise.all(
      stock.map(async (item) => {
        const itemBatches = await db
          .select()
          .from(batches)
          .where(and(eq(batches.medicineId, item.medicineId), eq(batches.userId, userId)));

        return {
          ...item,
          batches:
            itemBatches.length > 0
              ? itemBatches
              : [
                  {
                    quantity: item.quantity,
                    buyingPrice: item.buyingPrice || 0,
                    receivedDate: item.createdAt,
                  },
                ],
        };
      })
    );

    const result = valuateInventory(stockWithBatches, method);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/valuation/:medicineId?method=FIFO
router.get('/:medicineId', requireAuth, async (req, res, next) => {
  try {
    const method = req.query.method === 'WeightedAverage' ? 'WeightedAverage' : 'FIFO';

    const [stockItem] = await db
      .select({
        id: stockMedicines.id,
        medicineId: stockMedicines.medicineId,
        quantity: stockMedicines.quantity,
        sellingPrice: stockMedicines.sellingPrice,
        buyingPrice: stockMedicines.buyingPrice,
        createdAt: stockMedicines.createdAt,
        generalName: medicines.generalName,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(and(eq(stockMedicines.medicineId, req.params.medicineId), eq(stockMedicines.userId, req.user.id)));

    if (!stockItem) return res.status(404).json({ error: 'Stock item not found' });

    const itemBatches = await db
      .select()
      .from(batches)
      .where(and(eq(batches.medicineId, req.params.medicineId), eq(batches.userId, req.user.id)));

    const batchData =
      itemBatches.length > 0
        ? itemBatches
        : [{ quantity: stockItem.quantity, buyingPrice: stockItem.buyingPrice || 0, receivedDate: stockItem.createdAt }];

    const valuation =
      method === 'WeightedAverage'
        ? weightedAverageValuation(batchData)
        : fifoValuation(batchData);

    res.json({
      ...stockItem,
      ...valuation,
      sellingValue: Math.round(Number(stockItem.quantity) * Number(stockItem.sellingPrice) * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
