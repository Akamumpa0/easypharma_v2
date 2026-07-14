import { Router } from 'express';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  customerBills,
  customerBillRecords,
  stockMedicines,
  medicines,
  expenses,
  dailyReports,
} from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const round = (n) => Math.round(n * 100) / 100;

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateRange(period) {
  const now = new Date();
  const from = new Date();

  switch (period) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case 'week':
      from.setDate(now.getDate() - 7);
      break;
    case 'month':
      from.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      from.setFullYear(now.getFullYear() - 1);
      break;
    default:
      from.setDate(now.getDate() - 30);
  }

  return { from, to: now };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/analytics/profit?period=today|week|month|year
router.get('/profit', requireAuth, async (req, res, next) => {
  try {
    const { period = 'month', from: fromQ, to: toQ } = req.query;
    const { from, to } = fromQ && toQ
      ? { from: new Date(fromQ), to: new Date(toQ) }
      : dateRange(period);

    // Revenue from bills
    const bills = await db
      .select({
        id: customerBills.id,
        total: customerBills.totalAmount,
        createdAt: customerBills.createdAt,
      })
      .from(customerBills)
      .where(and(
        eq(customerBills.userId, req.user.id),
        gte(customerBills.createdAt, from),
        lte(customerBills.createdAt, to),
      ));

    const totalRevenue = bills.reduce((s, b) => s + Number(b.total), 0);

    // Expenses in same period
    const expenseRows = await db
      .select({ amount: expenses.amount })
      .from(expenses)
      .where(and(
        eq(expenses.userId, req.user.id),
        gte(expenses.expenseDate, from),
        lte(expenses.expenseDate, to),
      ));

    const totalExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);

    // Daily breakdown
    const reports = await db
      .select()
      .from(dailyReports)
      .where(and(
        eq(dailyReports.userId, req.user.id),
        gte(dailyReports.date, from),
        lte(dailyReports.date, to),
      ))
      .orderBy(dailyReports.date);

    const grossProfit = reports.reduce((s, r) => s + Number(r.totalProfit), 0);
    const totalCOGS   = reports.reduce((s, r) => s + Number(r.totalCost), 0);
    const netProfit   = grossProfit - totalExpenses;
    const grossMargin = totalRevenue > 0 ? round((grossProfit / totalRevenue) * 100) : 0;
    const netMargin   = totalRevenue > 0 ? round((netProfit / totalRevenue) * 100) : 0;

    res.json({
      period,
      from,
      to,
      totalRevenue: round(totalRevenue),
      totalCOGS: round(totalCOGS),
      grossProfit: round(grossProfit),
      totalExpenses: round(totalExpenses),
      netProfit: round(netProfit),
      grossMargin,
      netMargin,
      billCount: bills.length,
      dailyBreakdown: reports.map((r) => ({
        date: r.date,
        sales: r.totalSales,
        cost: r.totalCost,
        profit: r.totalProfit,
        bills: r.billCount,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/medicines?period=month — profit per medicine
router.get('/medicines', requireAuth, async (req, res, next) => {
  try {
    const { period = 'month', from: fromQ, to: toQ } = req.query;
    const { from, to } = fromQ && toQ
      ? { from: new Date(fromQ), to: new Date(toQ) }
      : dateRange(period);

    // Join bill records with bills to filter by user and date
    const rows = await db
      .select({
        medicineId: customerBillRecords.medicineId,
        medicineName: customerBillRecords.medicineName,
        quantity: sql`SUM(${customerBillRecords.quantity})`,
        revenue: sql`SUM(${customerBillRecords.subtotal})`,
      })
      .from(customerBillRecords)
      .innerJoin(customerBills, eq(customerBillRecords.billId, customerBills.id))
      .where(and(
        eq(customerBills.userId, req.user.id),
        gte(customerBills.createdAt, from),
        lte(customerBills.createdAt, to),
      ))
      .groupBy(customerBillRecords.medicineId, customerBillRecords.medicineName)
      .orderBy(desc(sql`SUM(${customerBillRecords.subtotal})`));

    // Attach buying price from stock for margin calc
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const [stock] = await db
          .select({ buyingPrice: stockMedicines.buyingPrice })
          .from(stockMedicines)
          .where(and(
            eq(stockMedicines.medicineId, row.medicineId),
            eq(stockMedicines.userId, req.user.id),
          ));

        const qty = Number(row.quantity);
        const revenue = Number(row.revenue);
        const cogs = stock ? qty * Number(stock.buyingPrice) : 0;
        const profit = revenue - cogs;
        const margin = revenue > 0 ? round((profit / revenue) * 100) : 0;

        return {
          medicineId: row.medicineId,
          medicineName: row.medicineName,
          quantitySold: qty,
          revenue: round(revenue),
          cogs: round(cogs),
          profit: round(profit),
          margin,
        };
      })
    );

    res.json({
      period,
      medicines: enriched,
      bestPerformers: enriched.slice(0, 5),
      leastPerformers: [...enriched].sort((a, b) => a.profit - b.profit).slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/sales?period=month — profit per individual sale
router.get('/sales', requireAuth, async (req, res, next) => {
  try {
    const { period = 'month', from: fromQ, to: toQ, limit = 50, page = 1 } = req.query;
    const { from, to } = fromQ && toQ
      ? { from: new Date(fromQ), to: new Date(toQ) }
      : dateRange(period);

    const bills = await db
      .select({
        id: customerBills.id,
        customerName: customerBills.customerName,
        totalAmount: customerBills.totalAmount,
        createdAt: customerBills.createdAt,
      })
      .from(customerBills)
      .where(and(
        eq(customerBills.userId, req.user.id),
        gte(customerBills.createdAt, from),
        lte(customerBills.createdAt, to),
      ))
      .orderBy(desc(customerBills.createdAt))
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));

    // For each bill, calculate profit by comparing selling vs buying price
    const enriched = await Promise.all(bills.map(async (bill) => {
      const items = await db
        .select({
          medicineId: customerBillRecords.medicineId,
          quantity: customerBillRecords.quantity,
          unitPrice: customerBillRecords.unitPrice,
          subtotal: customerBillRecords.subtotal,
        })
        .from(customerBillRecords)
        .where(eq(customerBillRecords.billId, bill.id));

      let totalCOGS = 0;
      for (const item of items) {
        const [stock] = await db
          .select({ buyingPrice: stockMedicines.buyingPrice })
          .from(stockMedicines)
          .where(and(
            eq(stockMedicines.medicineId, item.medicineId),
            eq(stockMedicines.userId, req.user.id),
          ));
        totalCOGS += Number(item.quantity) * Number(stock?.buyingPrice || 0);
      }

      const revenue = Number(bill.totalAmount);
      const profit = revenue - totalCOGS;
      const margin = revenue > 0 ? round((profit / revenue) * 100) : 0;

      return {
        billId: bill.id,
        customerName: bill.customerName || 'Walk-in',
        revenue: round(revenue),
        cogs: round(totalCOGS),
        profit: round(profit),
        margin,
        itemCount: items.length,
        date: bill.createdAt,
      };
    }));

    res.json({ period, sales: enriched });
  } catch (err) { next(err); }
});

// GET /api/analytics/summary — quick KPI summary
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    async function getRevenue(from) {
      const rows = await db
        .select({ total: customerBills.totalAmount })
        .from(customerBills)
        .where(and(eq(customerBills.userId, req.user.id), gte(customerBills.createdAt, from)));
      return round(rows.reduce((s, r) => s + Number(r.total), 0));
    }

    const [daily, weekly, monthly, annual] = await Promise.all([
      getRevenue(today),
      getRevenue(weekAgo),
      getRevenue(monthAgo),
      getRevenue(yearAgo),
    ]);

    // Inventory value
    const stock = await db
      .select({
        qty: stockMedicines.quantity,
        buyingPrice: stockMedicines.buyingPrice,
        sellingPrice: stockMedicines.sellingPrice,
      })
      .from(stockMedicines)
      .where(eq(stockMedicines.userId, req.user.id));

    const inventoryValue = round(
      stock.reduce((s, i) => s + Number(i.qty) * Number(i.buyingPrice || 0), 0)
    );
    const inventorySelling = round(
      stock.reduce((s, i) => s + Number(i.qty) * Number(i.sellingPrice), 0)
    );

    res.json({
      revenue: { daily, weekly, monthly, annual },
      inventory: {
        purchaseValue: inventoryValue,
        sellingValue: inventorySelling,
        potentialProfit: round(inventorySelling - inventoryValue),
        items: stock.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
