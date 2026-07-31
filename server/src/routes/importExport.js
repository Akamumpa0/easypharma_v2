import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { db } from '../db/index.js';
import { medicines, stockMedicines, customerBills, customerBillRecords, expenses } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../utils/imageUpload.js';
import { generateMedicineCode, generateEAN13Barcode } from '../utils/barcode.js';

const router = Router();

// ─── EXPORT ──────────────────────────────────────────────────────────────────

// GET /api/export/medicines?format=csv|excel
router.get('/medicines', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const format = req.query.format || 'excel';
    const rows = await db.select().from(medicines).orderBy(asc(medicines.createdAt), asc(medicines.id));

    const data = rows.map((m, idx) => ({
      ID: String(idx + 1).padStart(3, '0'),
      'General Name': m.generalName,
      'Brand Name': m.brandName || '',
      'Scientific Name': m.scientificName || '',
      Manufacturer: m.manufacturer || '',
      Category: m.category || '',
      'Unit Name': m.unitName,
      'Unit Type': m.unitType,
      'Medicine Code': m.medicineCode || '',
      Barcode: m.barcode || '',
      Description: m.description || '',
      Controlled: m.isControlled ? 'Yes' : 'No',
      Prescription: m.requiresPrescription ? 'Yes' : 'No',
      'Reorder Level': m.reorderLevel,
      'Reorder Quantity': m.reorderQuantity,
    }));

    if (format === 'csv') {
      const csv = csvStringify(data, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="medicines.csv"');
      return res.send(csv);
    }

    // Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Medicines');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 22 }));
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      data.forEach(row => ws.addRow(row));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="medicines.xlsx"');
    await wb.xlsx.write(res);
  } catch (err) { next(err); }
});

// GET /api/export/stock?format=csv|excel
router.get('/stock', requireAuth, async (req, res, next) => {
  try {
    const format = req.query.format || 'excel';

    const rows = await db
      .select({
        medicineName: medicines.generalName,
        brandName: medicines.brandName,
        unitName: medicines.unitName,
        quantity: stockMedicines.quantity,
        sellingPrice: stockMedicines.sellingPrice,
        buyingPrice: stockMedicines.buyingPrice,
        expiryDate: stockMedicines.expiryDate,
        updatedAt: stockMedicines.updatedAt,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(eq(stockMedicines.userId, req.user.id));

    const data = rows.map(r => ({
      Medicine: r.medicineName,
      Brand: r.brandName || '',
      Unit: r.unitName,
      Quantity: r.quantity,
      'Selling Price': r.sellingPrice,
      'Buying Price': r.buyingPrice || '',
      'Expiry Date': r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '',
      'Last Updated': new Date(r.updatedAt).toLocaleDateString(),
    }));

    if (format === 'csv') {
      const csv = csvStringify(data, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock.csv"');
      return res.send(csv);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Stock');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 20 }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      data.forEach(row => ws.addRow(row));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stock.xlsx"');
    await wb.xlsx.write(res);
  } catch (err) { next(err); }
});

// GET /api/export/sales?format=csv|excel
router.get('/sales', requireAuth, async (req, res, next) => {
  try {
    const format = req.query.format || 'excel';

    const bills = await db.select().from(customerBills)
      .where(eq(customerBills.userId, req.user.id));

    const data = [];
    for (const bill of bills) {
      const items = await db.select().from(customerBillRecords)
        .where(eq(customerBillRecords.billId, bill.id));
      for (const item of items) {
        data.push({
          'Bill ID': bill.id.slice(0, 8),
          Customer: bill.customerName || 'Walk-in',
          Medicine: item.medicineName,
          Quantity: item.quantity,
          'Unit Price': item.unitPrice,
          Subtotal: item.subtotal,
          'Bill Total': bill.totalAmount,
          Date: new Date(bill.createdAt).toLocaleDateString(),
        });
      }
    }

    if (format === 'csv') {
      const csv = csvStringify(data, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
      return res.send(csv);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sales');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 20 }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      data.forEach(row => ws.addRow(row));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
    await wb.xlsx.write(res);
  } catch (err) { next(err); }
});

// GET /api/export/expenses?format=csv|excel
router.get('/expenses', requireAuth, async (req, res, next) => {
  try {
    const format = req.query.format || 'excel';
    const rows = await db.select().from(expenses).where(eq(expenses.userId, req.user.id));

    const data = rows.map(e => ({
      Date: new Date(e.expenseDate).toLocaleDateString(),
      Type: e.type,
      Description: e.description || '',
      Amount: e.amount,
    }));

    if (format === 'csv') {
      const csv = csvStringify(data, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
      return res.send(csv);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Expenses');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 20 }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      data.forEach(row => ws.addRow(row));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.xlsx"');
    await wb.xlsx.write(res);
  } catch (err) { next(err); }
});

// ─── IMPORT ──────────────────────────────────────────────────────────────────

// POST /api/import/medicines — CSV or Excel bulk import
router.post('/medicines', requireAuth, requireRole('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const mime = req.file.mimetype;
    let rows = [];

    if (mime === 'text/csv' || mime === 'application/csv' || req.file.originalname.endsWith('.csv')) {
      const records = csvParse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true });
      rows = records;
    } else {
      // Excel
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(req.file.buffer);
      const ws = wb.worksheets[0];
      const headers = [];
      ws.getRow(1).eachCell(cell => headers.push(cell.value));
      ws.eachRow((row, i) => {
        if (i === 1) return;
        const obj = {};
        row.eachCell((cell, colNum) => {
          obj[headers[colNum - 1]] = cell.value;
        });
        rows.push(obj);
      });
    }

    let created = 0, updated = 0, errors = [];

    for (const row of rows) {
      try {
        const name = row['General Name'] || row['generalName'] || row['general_name'];
        if (!name) continue;

        const payload = {
          generalName:    name,
          brandName:      row['Brand Name']      || row['brandName']      || null,
          scientificName: row['Scientific Name'] || row['scientificName'] || null,
          manufacturer:   row['Manufacturer']    || row['manufacturer']   || null,
          category:       row['Category']        || row['category']       || null,
          unitName:       row['Unit Name']        || row['unitName']       || 'Tablet',
          description:    row['Description']      || row['description']    || null,
          reorderLevel:   parseInt(row['Reorder Level'] || row['reorderLevel'] || '10') || 10,
          reorderQuantity: parseInt(row['Reorder Quantity'] || row['reorderQuantity'] || '50') || 50,
          medicineCode: generateMedicineCode(),
          barcode: generateEAN13Barcode(),
        };

        await db.insert(medicines).values(payload).onConflictDoNothing();
        created++;
      } catch (e) {
        errors.push(`Row error: ${e.message}`);
      }
    }

    res.json({ created, updated, errors, total: rows.length });
  } catch (err) { next(err); }
});

export default router;
