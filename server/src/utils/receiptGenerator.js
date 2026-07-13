import PDFDocument from 'pdfkit';

/**
 * Generate a professional receipt PDF.
 * @param {object} receiptData
 * @param {object} res - Express response object (we pipe directly)
 */
export function generateReceiptPDF(receiptData, res) {
  const {
    receiptNumber,
    pharmacyName,
    tin,
    phone,
    address,
    cashier,
    date,
    time,
    items,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod,
    footer,
    customerName,
  } = receiptData;

  const doc = new PDFDocument({ size: 'A5', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt-${receiptNumber}.pdf"`);
  doc.pipe(res);

  const W = 420; // A5 width in points
  const textX = 40;

  // ── Header ────────────────────────────────────────────────────────────────
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(pharmacyName || 'EasyPharma', textX, 40, { width: W - 80, align: 'center' });

  doc.fontSize(9).font('Helvetica');
  if (tin)     doc.text(`TIN: ${tin}`, textX, doc.y, { align: 'center', width: W - 80 });
  if (phone)   doc.text(`Tel: ${phone}`, textX, doc.y, { align: 'center', width: W - 80 });
  if (address) doc.text(address, textX, doc.y, { align: 'center', width: W - 80 });

  doc.moveDown(0.5);
  doc.moveTo(textX, doc.y).lineTo(W - textX, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Receipt Meta ─────────────────────────────────────────────────────────
  doc.fontSize(9).font('Helvetica-Bold').text('RECEIPT', textX, doc.y, { align: 'center', width: W - 80 });
  doc.moveDown(0.3);

  const col1 = textX;
  const col2 = 200;

  doc.fontSize(8).font('Helvetica');
  const metaY = doc.y;
  doc.text(`Receipt No: ${receiptNumber}`, col1, metaY);
  doc.text(`Date: ${date}`, col2, metaY);
  const metaY2 = doc.y;
  doc.text(`Cashier: ${cashier || 'Staff'}`, col1, metaY2);
  doc.text(`Time: ${time}`, col2, metaY2);
  if (customerName) {
    doc.text(`Customer: ${customerName}`, col1, doc.y);
  }
  doc.text(`Payment: ${paymentMethod || 'Cash'}`, col2, doc.y);

  doc.moveDown(0.5);
  doc.moveTo(textX, doc.y).lineTo(W - textX, doc.y).stroke();

  // ── Column Headers ────────────────────────────────────────────────────────
  doc.moveDown(0.3);
  const colItem = textX;
  const colQty = 240;
  const colPrice = 290;
  const colTotal = 345;

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Item', colItem, doc.y);
  doc.text('Qty', colQty, doc.y - doc.currentLineHeight());
  doc.text('Price', colPrice, doc.y - doc.currentLineHeight());
  doc.text('Amount', colTotal, doc.y - doc.currentLineHeight());
  doc.moveDown(0.3);
  doc.moveTo(textX, doc.y).lineTo(W - textX, doc.y).stroke();

  // ── Line Items ────────────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(8);
  for (const item of items) {
    doc.moveDown(0.3);
    const rowY = doc.y;
    const name = item.medicineName || item.name;
    // Wrap long names
    doc.text(name.substring(0, 28), colItem, rowY, { width: colQty - colItem - 5 });
    const rowHeight = doc.y - rowY;
    doc.text(String(item.quantity), colQty, rowY);
    doc.text(`${parseFloat(item.unitPrice).toFixed(2)}`, colPrice, rowY);
    doc.text(`${parseFloat(item.subtotal).toFixed(2)}`, colTotal, rowY);
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  doc.moveDown(0.5);
  doc.moveTo(textX, doc.y).lineTo(W - textX, doc.y).stroke();
  doc.moveDown(0.3);

  const totalsLabelX = 260;
  const totalsValueX = 350;

  doc.fontSize(8).font('Helvetica');
  if (discount && parseFloat(discount) > 0) {
    doc.text('Subtotal:', totalsLabelX, doc.y);
    doc.text(parseFloat(subtotal).toFixed(2), totalsValueX, doc.y - doc.currentLineHeight(), { align: 'right', width: 60 });
    doc.moveDown(0.3);
    doc.text(`Discount:`, totalsLabelX, doc.y);
    doc.text(`-${parseFloat(discount).toFixed(2)}`, totalsValueX, doc.y - doc.currentLineHeight(), { align: 'right', width: 60 });
    doc.moveDown(0.3);
  }

  if (tax && parseFloat(tax) > 0) {
    doc.text('Tax:', totalsLabelX, doc.y);
    doc.text(parseFloat(tax).toFixed(2), totalsValueX, doc.y - doc.currentLineHeight(), { align: 'right', width: 60 });
    doc.moveDown(0.3);
  }

  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('TOTAL:', totalsLabelX, doc.y);
  doc.text(parseFloat(total).toFixed(2), totalsValueX, doc.y - doc.currentLineHeight(), { align: 'right', width: 60 });

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.moveDown(1);
  doc.moveTo(textX, doc.y).lineTo(W - textX, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').text(
    footer || 'Thank you for your purchase. Please keep this receipt.',
    textX, doc.y, { align: 'center', width: W - 80 }
  );

  doc.end();
}
