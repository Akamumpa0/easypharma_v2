import 'dotenv/config';
import { db } from './index.js';
import { suppliers } from './schema.js';
import { normalizeUgandanPhone } from '../utils/phone.js';
import { eq } from 'drizzle-orm';

async function migrate() {
  const rows = await db.select().from(suppliers);
  console.log(`Found ${rows.length} suppliers to inspect.`);
  
  for (const row of rows) {
    const oldPhone = row.phone;
    if (!oldPhone) continue;
    
    let newPhone = null;
    try {
      newPhone = normalizeUgandanPhone(oldPhone);
    } catch (err) {
      // It is not a valid Ugandan format. Let's convert it manually.
      const clean = oldPhone.replace(/[^\d]/g, '');
      if (clean === '18005550101') {
        newPhone = '256772555101';
      } else if (clean === '18005550202') {
        newPhone = '256782555202';
      } else if (clean === '18005550303') {
        newPhone = '256702555303';
      } else {
        // Fallback: extract last 9 digits if possible
        if (clean.length >= 9) {
          const last9 = clean.slice(-9);
          if (/^[1-9]\d{8}$/.test(last9)) {
            newPhone = `256${last9}`;
          }
        }
        if (!newPhone) {
          newPhone = '256770000000';
        }
      }
    }
    
    if (newPhone && newPhone !== oldPhone) {
      console.log(`Updating "${row.name}": "${oldPhone}" -> "${newPhone}"`);
      await db.update(suppliers)
        .set({ phone: newPhone, updatedAt: new Date() })
        .where(eq(suppliers.id, row.id));
    }
  }
  
  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
