import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerBills, customerBillRecords, users, systemSettings } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { generateReceiptPDF } from '../utils/receiptGenerator.js';

const router = Router();

function receiptNumber(billId) {
  return 'RCP-' + billId.slice(0, 8).toUpperCase();
}

// GET /api/receipts/:billId — JSON receipt data
router.get('/:billId', requireAuth, async (req, res, next) => {
  try {
    const [bill] = await db.select().from(customerBills)
      .where(and(eq(customerBills.id, req.params.billId), eq(customerBills.userId, req.user.id)));

    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const items = await db.select().from(customerBillRecords)
      .where(eq(customerBillRecords.billId, bill.id));

    const [user] = await db.select({
      firstName: users.firstName,
      lastName: users.lastName,
      pharmacyName: users.pharmacyName,
      address: users.address,
      phone: users.phone,
      tin: users.tin,
    }).from(users).where(eq(users.id, req.user.id));

    res.json({
      receiptNumber: receiptNumber(bill.id),
      bill,
      items,
      pharmacy: user,
    });
  } catch (err) { next(err); }
});

// GET /api/receipts/:billId/pdf — PDF download
router.get('/:billId/pdf', requireAuth, async (req, res, next) => {
  try {
    const [bill] = await db.select().from(customerBills)
      .where(and(eq(customerBills.id, req.params.billId), eq(customerBills.userId, req.user.id)));

    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const items = await db.select().from(customerBillRecords)
      .where(eq(customerBillRecords.billId, bill.id));

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));

    const billDate = new Date(bill.createdAt);

    generateReceiptPDF({
      receiptNumber: receiptNumber(bill.id),
      pharmacyName: user.pharmacyName || 'EasyPharma',
      tin: user.tin,
      phone: user.phone,
      address: user.address,
      cashier: `${user.firstName} ${user.lastName}`,
      customerName: bill.customerName,
      date: billDate.toLocaleDateString(),
      time: billDate.toLocaleTimeString(),
      items: items.map((i) => ({
        medicineName: i.medicineName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal: bill.totalAmount,
      tax: '0',
      discount: '0',
      total: bill.totalAmount,
      paymentMethod: 'Cash',
      footer: 'Thank you for your purchase. Come back soon!',
    }, res);
  } catch (err) { next(err); }
});

export default router;
