import { Router } from 'express';
import { or, and, ilike, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { medicines, stockMedicines, batches, suppliers } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/search/medicines — advanced search with all filters
router.get('/medicines', requireAuth, async (req, res, next) => {
  try {
    const {
      q,             // general text search
      barcode,
      medicineCode,
      brandName,
      manufacturer,
      category,
      unitType,
      controlled,
      prescription,
      expiryBefore,
      expiryAfter,
      priceMin,
      priceMax,
      stockStatus,   // in_stock | low_stock | out_of_stock
      supplierId,
      page = 1,
      limit = 50,
    } = req.query;

    // Build base medicine conditions
    const medConditions = [];

    if (q) {
      medConditions.push(or(
        ilike(medicines.generalName,    `%${q}%`),
        ilike(medicines.scientificName, `%${q}%`),
        ilike(medicines.brandName,      `%${q}%`),
        ilike(medicines.manufacturer,   `%${q}%`),
        ilike(medicines.description,    `%${q}%`),
        ilike(medicines.medicineCode,   `%${q}%`),
        ilike(medicines.barcode,        `%${q}%`),
      ));
    }
    if (barcode)      medConditions.push(ilike(medicines.barcode,      `%${barcode}%`));
    if (medicineCode) medConditions.push(ilike(medicines.medicineCode, `%${medicineCode}%`));
    if (brandName)    medConditions.push(ilike(medicines.brandName,    `%${brandName}%`));
    if (manufacturer) medConditions.push(ilike(medicines.manufacturer, `%${manufacturer}%`));
    if (category)     medConditions.push(eq(medicines.category, category));
    if (unitType)     medConditions.push(eq(medicines.unitType, unitType));
    if (controlled === 'true')    medConditions.push(eq(medicines.isControlled, true));
    if (prescription  === 'true') medConditions.push(eq(medicines.requiresPrescription, true));

    const allMeds = await db.select().from(medicines)
      .where(medConditions.length ? and(...medConditions) : undefined);

    // Enrich with stock info for this user
    const stockRows = await db
      .select({
        medicineId: stockMedicines.medicineId,
        quantity:   stockMedicines.quantity,
        sellingPrice: stockMedicines.sellingPrice,
        buyingPrice:  stockMedicines.buyingPrice,
        expiryDate:   stockMedicines.expiryDate,
      })
      .from(stockMedicines)
      .where(eq(stockMedicines.userId, req.user.id));

    const stockMap = Object.fromEntries(stockRows.map(s => [s.medicineId, s]));

    let enriched = allMeds.map(m => ({
      ...m,
      stock: stockMap[m.id] || null,
    }));

    // Apply stock-based filters
    if (priceMin) enriched = enriched.filter(m => m.stock && parseFloat(m.stock.sellingPrice) >= parseFloat(priceMin));
    if (priceMax) enriched = enriched.filter(m => m.stock && parseFloat(m.stock.sellingPrice) <= parseFloat(priceMax));
    if (expiryBefore) {
      const d = new Date(expiryBefore);
      enriched = enriched.filter(m => m.stock?.expiryDate && new Date(m.stock.expiryDate) <= d);
    }
    if (expiryAfter) {
      const d = new Date(expiryAfter);
      enriched = enriched.filter(m => m.stock?.expiryDate && new Date(m.stock.expiryDate) >= d);
    }
    if (stockStatus) {
      enriched = enriched.filter(m => {
        const qty = m.stock?.quantity ?? 0;
        const level = m.reorderLevel ?? 10;
        if (stockStatus === 'out_of_stock') return qty === 0;
        if (stockStatus === 'low_stock')    return qty > 0 && qty <= level;
        if (stockStatus === 'in_stock')     return qty > level;
        return true;
      });
    }

    // Paginate
    const total = enriched.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paged  = enriched.slice(offset, offset + parseInt(limit));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      results: paged,
    });
  } catch (err) { next(err); }
});

// GET /api/search/global?q= — quick search across medicines, suppliers
router.get('/global', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ medicines: [], suppliers: [] });

    const [meds, sups] = await Promise.all([
      db.select({
        id: medicines.id,
        generalName: medicines.generalName,
        brandName: medicines.brandName,
        barcode: medicines.barcode,
        medicineCode: medicines.medicineCode,
      }).from(medicines).where(or(
        ilike(medicines.generalName,  `%${q}%`),
        ilike(medicines.brandName,    `%${q}%`),
        ilike(medicines.barcode,      `%${q}%`),
        ilike(medicines.medicineCode, `%${q}%`),
      )).limit(10),

      db.select({ id: suppliers.id, name: suppliers.name, phone: suppliers.phone })
        .from(suppliers)
        .where(ilike(suppliers.name, `%${q}%`))
        .limit(5),
    ]);

    res.json({ medicines: meds, suppliers: sups });
  } catch (err) { next(err); }
});

export default router;
