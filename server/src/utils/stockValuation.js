/**
 * Stock Valuation Engine
 * Supports FIFO and Weighted Average Cost methods.
 * All calculations are done in JS from batch records.
 */

/**
 * FIFO valuation: consumes oldest batches first.
 * Returns: { totalCost, totalQty, unitCost }
 */
export function fifoValuation(batches) {
  // batches: [{ quantity, buyingPrice, receivedDate }], sorted oldest-first by caller
  const sorted = [...batches].sort(
    (a, b) => new Date(a.receivedDate) - new Date(b.receivedDate)
  );

  let totalCost = 0;
  let totalQty = 0;

  for (const batch of sorted) {
    const qty = Number(batch.quantity);
    const price = Number(batch.buyingPrice);
    totalCost += qty * price;
    totalQty += qty;
  }

  const unitCost = totalQty > 0 ? totalCost / totalQty : 0;

  return {
    method: 'FIFO',
    totalQty,
    totalCost: round(totalCost),
    unitCost: round(unitCost),
  };
}

/**
 * FIFO cost of goods sold for a given quantity to be sold.
 */
export function fifoCOGS(batches, qtyToSell) {
  const sorted = [...batches].sort(
    (a, b) => new Date(a.receivedDate) - new Date(b.receivedDate)
  );

  let remaining = qtyToSell;
  let cogs = 0;
  const consumed = [];

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const usable = Math.min(remaining, Number(batch.quantity));
    const cost = usable * Number(batch.buyingPrice);
    cogs += cost;
    remaining -= usable;
    consumed.push({ batchId: batch.id, qty: usable, price: batch.buyingPrice, cost: round(cost) });
  }

  return {
    qtyRequested: qtyToSell,
    qtyFulfilled: qtyToSell - remaining,
    totalCOGS: round(cogs),
    consumed,
    insufficient: remaining > 0,
  };
}

/**
 * Weighted Average Cost valuation.
 */
export function weightedAverageValuation(batches) {
  let totalCost = 0;
  let totalQty = 0;

  for (const batch of batches) {
    const qty = Number(batch.quantity);
    const price = Number(batch.buyingPrice);
    totalCost += qty * price;
    totalQty += qty;
  }

  const unitCost = totalQty > 0 ? totalCost / totalQty : 0;

  return {
    method: 'Weighted Average',
    totalQty,
    totalCost: round(totalCost),
    unitCost: round(unitCost),
  };
}

/**
 * Full inventory valuation for a list of stock items with their batches.
 */
export function valuateInventory(stockItems, method = 'FIFO') {
  const results = [];
  let grandTotalPurchaseValue = 0;
  let grandTotalSellingValue = 0;
  let grandTotalPotentialProfit = 0;
  let grandTotalQty = 0;

  for (const item of stockItems) {
    const batches = item.batches || [
      {
        quantity: item.quantity,
        buyingPrice: item.buyingPrice || 0,
        receivedDate: item.createdAt || new Date(),
      },
    ];

    const valuation =
      method === 'FIFO'
        ? fifoValuation(batches)
        : weightedAverageValuation(batches);

    const sellingValue = Number(item.quantity) * Number(item.sellingPrice);
    const potentialProfit = sellingValue - valuation.totalCost;

    results.push({
      medicineId: item.medicineId,
      medicineName: item.generalName || item.medicineName,
      quantity: item.quantity,
      unitCost: valuation.unitCost,
      purchaseValue: valuation.totalCost,
      sellingPrice: item.sellingPrice,
      sellingValue: round(sellingValue),
      potentialProfit: round(potentialProfit),
      margin: valuation.totalCost > 0
        ? round((potentialProfit / sellingValue) * 100)
        : 0,
      method: valuation.method,
    });

    grandTotalPurchaseValue += valuation.totalCost;
    grandTotalSellingValue += sellingValue;
    grandTotalPotentialProfit += potentialProfit;
    grandTotalQty += Number(item.quantity);
  }

  return {
    items: results,
    summary: {
      totalItems: results.length,
      totalQuantity: grandTotalQty,
      totalPurchaseValue: round(grandTotalPurchaseValue),
      totalSellingValue: round(grandTotalSellingValue),
      totalPotentialProfit: round(grandTotalPotentialProfit),
      overallMargin:
        grandTotalSellingValue > 0
          ? round((grandTotalPotentialProfit / grandTotalSellingValue) * 100)
          : 0,
      method,
    },
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
