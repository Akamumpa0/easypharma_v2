import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { users, medicines, stockMedicines, customerBills,
  customerBillRecords, suppliers, expenses, activityLogs,
  dailyReports, categories } from './schema.js';
import { eq } from 'drizzle-orm';
import { generateMedicineCode, generateEAN13Barcode } from '../utils/barcode.js';

const ADMIN_EMAIL    = 'admin@easypharma.com';
const ADMIN_PASSWORD = 'Admin@123';

const SAMPLE_MEDICINES = [
  { generalName: 'Amoxicillin',        brandName: 'Amoxil',        manufacturer: 'GlaxoSmithKline', category: 'Antibiotic',    unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 50,  reorderQuantity: 200, requiresPrescription: true  },
  { generalName: 'Paracetamol',        brandName: 'Panadol',       manufacturer: 'GSK',             category: 'Analgesic',     unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 100, reorderQuantity: 500, requiresPrescription: false },
  { generalName: 'Metformin',          brandName: 'Glucophage',    manufacturer: 'Merck',           category: 'Antidiabetic',  unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 30,  reorderQuantity: 100, requiresPrescription: true  },
  { generalName: 'Amlodipine',         brandName: 'Norvasc',       manufacturer: 'Pfizer',          category: 'Antihypertensive', unitName: 'Tablet', unitType: 'tablet', reorderLevel: 30,  reorderQuantity: 100, requiresPrescription: true  },
  { generalName: 'Omeprazole',         brandName: 'Prilosec',      manufacturer: 'AstraZeneca',     category: 'Antacid',       unitName: 'Capsule',  unitType: 'capsule', reorderLevel: 20,  reorderQuantity: 100, requiresPrescription: false },
  { generalName: 'Ciprofloxacin',      brandName: 'Cipro',         manufacturer: 'Bayer',           category: 'Antibiotic',    unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 20,  reorderQuantity: 100, requiresPrescription: true  },
  { generalName: 'Ibuprofen',          brandName: 'Brufen',        manufacturer: 'Abbott',          category: 'NSAID',         unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 50,  reorderQuantity: 200, requiresPrescription: false },
  { generalName: 'Atorvastatin',       brandName: 'Lipitor',       manufacturer: 'Pfizer',          category: 'Statin',        unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 20,  reorderQuantity: 100, requiresPrescription: true  },
  { generalName: 'Salbutamol',         brandName: 'Ventolin',      manufacturer: 'GSK',             category: 'Bronchodilator',unitName: 'Inhaler',  unitType: 'bottle',  reorderLevel: 10,  reorderQuantity: 50,  requiresPrescription: true  },
  { generalName: 'Metronidazole',      brandName: 'Flagyl',        manufacturer: 'Sanofi',          category: 'Antibiotic',    unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 20,  reorderQuantity: 100, requiresPrescription: true  },
  { generalName: 'Oral Rehydration',   brandName: 'ORS',           manufacturer: 'WHO',             category: 'Electrolyte',   unitName: 'Packet',   unitType: 'packet',  reorderLevel: 50,  reorderQuantity: 200, requiresPrescription: false },
  { generalName: 'Vitamin C 500mg',    brandName: 'Ascorbic Acid', manufacturer: 'Nature Made',     category: 'Supplement',    unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 50,  reorderQuantity: 200, requiresPrescription: false },
  { generalName: 'Artemether/Lumefantrine', brandName: 'Coartem', manufacturer: 'Novartis',        category: 'Antimalarial',  unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 30,  reorderQuantity: 100, requiresPrescription: true, isControlled: true },
  { generalName: 'Zinc Sulfate',       brandName: 'Zincovit',      manufacturer: 'Apex Labs',       category: 'Supplement',    unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 20,  reorderQuantity: 100, requiresPrescription: false },
  { generalName: 'Cotrimoxazole',      brandName: 'Bactrim',       manufacturer: 'Roche',           category: 'Antibiotic',    unitName: 'Tablet',   unitType: 'tablet',  reorderLevel: 30,  reorderQuantity: 100, requiresPrescription: true  },
];

const SAMPLE_SUPPLIERS = [
  { name: 'MedSupply Ltd',    email: 'orders@medsupply.com',   phone: '256772555101', address: '123 Pharma St', leadTimeDays: 5  },
  { name: 'Global Pharma',    email: 'supply@globalpharma.com',phone: '256782555202', address: '456 Med Ave',   leadTimeDays: 7  },
  { name: 'HealthFirst Inc',  email: 'orders@healthfirst.com', phone: '256702555303', address: '789 Health Rd', leadTimeDays: 3  },
];

const EXPENSE_TYPES = ['rent', 'electricity', 'water', 'salary', 'internet'];

async function seed() {
  console.log('🌱 Starting EasyPharma seed...');

  // ── Admin user ───────────────────────────────────────────────────────────
  const [existingAdmin] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
  let adminUser;
  if (existingAdmin) {
    console.log('  ✓ Admin already exists');
    adminUser = existingAdmin;
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    [adminUser] = await db.insert(users).values({
      email: ADMIN_EMAIL, passwordHash,
      firstName: 'System', lastName: 'Admin',
      role: 'admin', isActive: true,
      pharmacyName: 'EasyPharma HQ', tin: 'TIN-000001',
      phone: '256772555001', address: '1 Pharma Plaza',
    }).returning();
    console.log('  ✓ Admin user created');
  }

  // ── Pharmacist user ──────────────────────────────────────────────────────
  let pharmacist;
  const [existingPharmacist] = await db.select().from(users)
    .where(eq(users.email, 'pharmacist@easypharma.com'));
  if (existingPharmacist) {
    console.log('  ✓ Pharmacist already exists');
    pharmacist = existingPharmacist;
  } else {
    const passwordHash = await bcrypt.hash('Pharma@123', 12);
    [pharmacist] = await db.insert(users).values({
      email: 'pharmacist@easypharma.com', passwordHash,
      firstName: 'Jane', lastName: 'Doe',
      role: 'pharmacist', isActive: true,
      pharmacyName: 'City Pharmacy', tin: 'TIN-100001',
      phone: '256772555002', address: '10 Main Street',
    }).returning();
    console.log('  ✓ Pharmacist user created');
  }

  // ── Suppliers ────────────────────────────────────────────────────────────
  const seededSuppliers = [];
  for (const s of SAMPLE_SUPPLIERS) {
    const [sup] = await db.insert(suppliers).values(s)
      .onConflictDoNothing().returning();
    if (sup) seededSuppliers.push(sup);
  }
  const allSuppliers = await db.select().from(suppliers);
  console.log(`  ✓ ${allSuppliers.length} suppliers ready`);

  // ── Medicines ────────────────────────────────────────────────────────────
  const seededMeds = [];
  for (const m of SAMPLE_MEDICINES) {
    const [med] = await db.insert(medicines).values({
      ...m, scientificName: m.generalName,
      medicineCode: generateMedicineCode(),
      barcode: generateEAN13Barcode(),
    }).onConflictDoNothing().returning();
    if (med) seededMeds.push(med);
  }
  const allMeds = await db.select().from(medicines);
  console.log(`  ✓ ${allMeds.length} medicines in catalog`);

  // ── Stock ────────────────────────────────────────────────────────────────
  let stockCount = 0;
  for (const med of allMeds) {
    const qty = Math.floor(Math.random() * 200) + 20;
    const buyingPrice = (Math.random() * 8 + 2).toFixed(2);
    const sellingPrice = (parseFloat(buyingPrice) * (1.3 + Math.random() * 0.4)).toFixed(2);
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 18) + 6);

    const [existing] = await db.select().from(stockMedicines)
      .where(eq(stockMedicines.medicineId, med.id));
    if (!existing) {
      await db.insert(stockMedicines).values({
        userId: pharmacist.id, medicineId: med.id,
        quantity: qty, sellingPrice, buyingPrice, expiryDate,
      });
      stockCount++;
    }
  }
  console.log(`  ✓ ${stockCount} stock items added`);

  // ── Sample bills ─────────────────────────────────────────────────────────
  const stockItems = await db.select({
    medicineId: stockMedicines.medicineId,
    sellingPrice: stockMedicines.sellingPrice,
    buyingPrice: stockMedicines.buyingPrice,
    generalName: medicines.generalName,
  })
  .from(stockMedicines)
  .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
  .where(eq(stockMedicines.userId, pharmacist.id));

  const today = new Date();
  let billCount = 0;
  for (let i = 0; i < 30; i++) {
    const billDate = new Date(today);
    billDate.setDate(today.getDate() - Math.floor(Math.random() * 30));

    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedItems = stockItems.sort(() => 0.5 - Math.random()).slice(0, numItems);
    if (selectedItems.length === 0) continue;

    let total = 0;
    const lineItems = selectedItems.map(item => {
      const qty = Math.floor(Math.random() * 4) + 1;
      const subtotal = qty * parseFloat(item.sellingPrice);
      total += subtotal;
      return { medicineId: item.medicineId, medicineName: item.generalName,
        quantity: qty, unitPrice: item.sellingPrice, subtotal: subtotal.toFixed(2) };
    });

    const [bill] = await db.insert(customerBills).values({
      userId: pharmacist.id, customerName: `Customer ${i + 1}`,
      totalAmount: total.toFixed(2), createdAt: billDate,
    }).returning();

    for (const item of lineItems) {
      await db.insert(customerBillRecords).values({ billId: bill.id, ...item });
    }

    // Daily report
    const dateKey = billDate.toISOString().slice(0, 10);
    const dayStart = new Date(`${dateKey}T00:00:00Z`);
    const [existing] = await db.select().from(dailyReports).where(eq(dailyReports.date, dayStart));
    if (existing) {
      await db.update(dailyReports).set({
        totalSales: (parseFloat(existing.totalSales) + total).toFixed(2),
        totalProfit: (parseFloat(existing.totalProfit) + total * 0.3).toFixed(2),
        billCount: existing.billCount + 1,
      }).where(eq(dailyReports.id, existing.id));
    } else {
      await db.insert(dailyReports).values({
        userId: pharmacist.id, date: dayStart,
        totalSales: total.toFixed(2),
        totalCost: (total * 0.7).toFixed(2),
        totalProfit: (total * 0.3).toFixed(2),
        billCount: 1,
      });
    }
    billCount++;
  }
  console.log(`  ✓ ${billCount} sample bills created`);

  // ── Sample expenses ──────────────────────────────────────────────────────
  let expenseCount = 0;
  for (let i = 0; i < 10; i++) {
    const type = EXPENSE_TYPES[Math.floor(Math.random() * EXPENSE_TYPES.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    await db.insert(expenses).values({
      userId: pharmacist.id, createdBy: pharmacist.id,
      type, description: `${type} payment`,
      amount: (Math.random() * 500 + 50).toFixed(2),
      expenseDate: date,
    });
    expenseCount++;
  }
  console.log(`  ✓ ${expenseCount} sample expenses created`);

  console.log('\n✅ Seed complete!');
  console.log('   Admin:      admin@easypharma.com / Admin@123');
  console.log('   Pharmacist: pharmacist@easypharma.com / Pharma@123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
