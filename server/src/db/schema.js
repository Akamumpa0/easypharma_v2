import {
  pgTable, uuid, varchar, text, integer, numeric,
  boolean, timestamp, pgEnum,
} from 'drizzle-orm/pg-core';

// ---------- Enums ----------
export const userRoleEnum = pgEnum('user_role', ['admin', 'pharmacist']);
export const subscriptionEnum = pgEnum('subscription_type', ['free_subscription', 'paid_subscription']);

export const unitTypeEnum = pgEnum('unit_type', [
  'tablet', 'capsule', 'bottle', 'tube', 'injection', 'vial', 'ampoule',
  'packet', 'box', 'strip', 'carton', 'ml', 'litre', 'gram', 'kilogram'
]);

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'draft', 'pending', 'approved', 'ordered', 'received', 'cancelled'
]);

export const returnReasonEnum = pgEnum('return_reason', [
  'expired', 'damaged', 'wrong_item', 'excess', 'quality_issue', 'other'
]);

export const damageReasonEnum = pgEnum('damage_reason', [
  'broken', 'wet', 'expired', 'packaging_damage', 'contaminated', 'other'
]);

export const disposalReasonEnum = pgEnum('disposal_reason', [
  'expired', 'damaged', 'recalled', 'obsolete', 'contaminated', 'other'
]);

export const expenseTypeEnum = pgEnum('expense_type', [
  'rent', 'electricity', 'water', 'transport', 'internet', 'repairs',
  'salary', 'maintenance', 'supplies', 'marketing', 'insurance', 'miscellaneous'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'low_stock', 'near_expiry', 'expired', 'new_purchase', 'large_sale',
  'return', 'adjustment', 'backup_failure', 'login_alert', 'system'
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'login', 'logout', 'create', 'update', 'delete', 'purchase', 'sale',
  'return', 'adjustment', 'backup', 'restore', 'export', 'import'
]);

// ---------- Users ----------
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName:    varchar('first_name', { length: 100 }).notNull(),
  lastName:     varchar('last_name', { length: 100 }).notNull(),
  role:         userRoleEnum('role').notNull().default('pharmacist'),
  isActive:     boolean('is_active').notNull().default(false),
  pharmacyName: varchar('pharmacy_name', { length: 255 }),
  address:      text('address'),
  phone:        varchar('phone', { length: 30 }),
  profilePhoto: text('profile_photo'), // URL to uploaded photo
  tin:          varchar('tin', { length: 50 }), // Tax Identification Number
  lastLogin:    timestamp('last_login'),
  passwordChangedAt: timestamp('password_changed_at'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ---------- Medicines (global catalog) ----------
export const medicines = pgTable('medicines', {
  id:             uuid('id').primaryKey().defaultRandom(),
  generalName:    varchar('general_name', { length: 255 }).notNull(),
  scientificName: varchar('scientific_name', { length: 255 }),
  brandName:      varchar('brand_name', { length: 255 }),
  manufacturer:   varchar('manufacturer', { length: 255 }),
  medicineCode:   varchar('medicine_code', { length: 100 }).unique(),
  barcode:        varchar('barcode', { length: 100 }).unique(),
  qrCode:         text('qr_code'), // QR code data/image
  description:    text('description'),
  unitName:       varchar('unit_name', { length: 50 }).notNull(), // e.g. tablet, bottle
  unitType:       unitTypeEnum('unit_type').notNull().default('tablet'),
  category:       varchar('category', { length: 100 }),
  imageUrl:       text('image_url'), // Main medicine image
  isControlled:   boolean('is_controlled').default(false),
  requiresPrescription: boolean('requires_prescription').default(false),
  reorderLevel:   integer('reorder_level').default(10), // Minimum stock before reorder
  reorderQuantity: integer('reorder_quantity').default(50), // Suggested reorder qty
  createdAt:      timestamp('created_at').defaultNow(),
  updatedAt:      timestamp('updated_at').defaultNow(),
});

// ---------- Stock (per pharmacist) ----------
export const stockMedicines = pgTable('stock_medicines', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id, { onDelete: 'cascade' }),
  quantity:     integer('quantity').notNull().default(0),
  sellingPrice: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  buyingPrice:  numeric('buying_price', { precision: 10, scale: 2 }),
  expiryDate:   timestamp('expiry_date'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ---------- Customer Bills ----------
export const customerBills = pgTable('customer_bills', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  customerName: varchar('customer_name', { length: 255 }),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ---------- Customer Bill Records (line items) ----------
export const customerBillRecords = pgTable('customer_bill_records', {
  id:          uuid('id').primaryKey().defaultRandom(),
  billId:      uuid('bill_id').notNull().references(() => customerBills.id, { onDelete: 'cascade' }),
  medicineId:  uuid('medicine_id').notNull().references(() => medicines.id),
  medicineName: varchar('medicine_name', { length: 255 }).notNull(),
  quantity:    integer('quantity').notNull(),
  unitPrice:   numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal:    numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
});

// ---------- Stock Bill Records (restocking) ----------
export const stockBillRecords = pgTable('stock_bill_records', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id),
  medicineName: varchar('medicine_name', { length: 255 }).notNull(),
  quantity:     integer('quantity').notNull(),
  buyingPrice:  numeric('buying_price', { precision: 10, scale: 2 }).notNull(),
  totalCost:    numeric('total_cost', { precision: 10, scale: 2 }).notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Daily Reports ----------
export const dailyReports = pgTable('daily_reports', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:         timestamp('date').notNull(),
  totalSales:   numeric('total_sales', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCost:    numeric('total_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  totalProfit:  numeric('total_profit', { precision: 10, scale: 2 }).notNull().default('0'),
  billCount:    integer('bill_count').notNull().default(0),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- API Users (external API access) ----------
export const apiUsers = pgTable('api_users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         varchar('name', { length: 255 }).notNull(),
  email:        varchar('email', { length: 255 }).notNull().unique(),
  apiKey:       uuid('api_key').notNull().defaultRandom().unique(),
  subscription: subscriptionEnum('subscription').notNull().default('free_subscription'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ---------- Categories ----------
export const categories = pgTable('categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ---------- Suppliers ----------
export const suppliers = pgTable('suppliers', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         varchar('name', { length: 255 }).notNull(),
  email:        varchar('email', { length: 255 }),
  phone:        varchar('phone', { length: 30 }),
  address:      text('address'),
  tin:          varchar('tin', { length: 50 }),
  leadTimeDays: integer('lead_time_days').default(7), // Average delivery time
  rating:       numeric('rating', { precision: 3, scale: 2 }).default('0'), // 0-5 stars
  isActive:     boolean('is_active').default(true),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ---------- Batches ----------
export const batches = pgTable('batches', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id, { onDelete: 'cascade' }),
  batchNumber:  varchar('batch_number', { length: 100 }).notNull(),
  quantity:     integer('quantity').notNull(),
  buyingPrice:  numeric('buying_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  expiryDate:   timestamp('expiry_date'),
  receivedDate: timestamp('received_date').defaultNow(),
  supplierId:   uuid('supplier_id').references(() => suppliers.id),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Purchase Orders ----------
export const purchaseOrders = pgTable('purchase_orders', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  supplierId:   uuid('supplier_id').notNull().references(() => suppliers.id),
  orderNumber:  varchar('order_number', { length: 100 }).unique().notNull(),
  status:       purchaseOrderStatusEnum('status').default('draft'),
  totalAmount:  numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  notes:        text('notes'),
  orderedAt:    timestamp('ordered_at'),
  receivedAt:   timestamp('received_at'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ---------- Purchase Order Items ----------
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id),
  quantity:     integer('quantity').notNull(),
  unitPrice:    numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal:     numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
});

// ---------- Customer Returns ----------
export const customerReturns = pgTable('customer_returns', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  billId:       uuid('bill_id').references(() => customerBills.id),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id),
  batchNumber:  varchar('batch_number', { length: 100 }),
  quantity:     integer('quantity').notNull(),
  reason:       returnReasonEnum('reason').notNull(),
  reasonDetail: text('reason_detail'),
  returnedBy:   varchar('returned_by', { length: 255 }),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Supplier Returns ----------
export const supplierReturns = pgTable('supplier_returns', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  supplierId:   uuid('supplier_id').notNull().references(() => suppliers.id),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id),
  batchNumber:  varchar('batch_number', { length: 100 }),
  quantity:     integer('quantity').notNull(),
  reason:       returnReasonEnum('reason').notNull(),
  reasonDetail: text('reason_detail'),
  approved:     boolean('approved').default(false),
  approvedBy:   uuid('approved_by').references(() => users.id),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Damaged Medicines ----------
export const damagedMedicines = pgTable('damaged_medicines', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id),
  batchNumber:  varchar('batch_number', { length: 100 }),
  quantity:     integer('quantity').notNull(),
  reason:       damageReasonEnum('reason').notNull(),
  reasonDetail: text('reason_detail'),
  reportedBy:   uuid('reported_by').references(() => users.id),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Disposals ----------
export const disposals = pgTable('disposals', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  medicineId:     uuid('medicine_id').notNull().references(() => medicines.id),
  batchNumber:    varchar('batch_number', { length: 100 }),
  quantity:       integer('quantity').notNull(),
  reason:         disposalReasonEnum('reason').notNull(),
  reasonDetail:   text('reason_detail'),
  disposalMethod: varchar('disposal_method', { length: 255 }),
  witness:        varchar('witness', { length: 255 }),
  approvedBy:     uuid('approved_by').references(() => users.id),
  disposalDate:   timestamp('disposal_date').notNull(),
  createdAt:      timestamp('created_at').defaultNow(),
});

// ---------- Stock Movements ----------
export const stockMovements = pgTable('stock_movements', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  medicineId:   uuid('medicine_id').notNull().references(() => medicines.id),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // purchased, sold, returned, damaged, disposed, adjusted
  quantity:     integer('quantity').notNull(), // positive or negative
  batchNumber:  varchar('batch_number', { length: 100 }),
  referenceId:  uuid('reference_id'), // ID of related transaction (bill, return, etc.)
  notes:        text('notes'),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Expenses ----------
export const expenses = pgTable('expenses', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:         expenseTypeEnum('type').notNull(),
  description:  text('description'),
  amount:       numeric('amount', { precision: 10, scale: 2 }).notNull(),
  expenseDate:  timestamp('expense_date').notNull(),
  receiptUrl:   text('receipt_url'), // Optional receipt image/PDF
  createdBy:    uuid('created_by').references(() => users.id),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Notifications ----------
export const notifications = pgTable('notifications', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:         notificationTypeEnum('type').notNull(),
  title:        varchar('title', { length: 255 }).notNull(),
  message:      text('message').notNull(),
  referenceId:  uuid('reference_id'), // Related entity ID
  isRead:       boolean('is_read').default(false),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- Activity Logs ----------
export const activityLogs = pgTable('activity_logs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').references(() => users.id),
  activityType: activityTypeEnum('activity_type').notNull(),
  module:       varchar('module', { length: 100 }).notNull(), // e.g. medicines, sales, users
  action:       varchar('action', { length: 100 }).notNull(), // e.g. created_user, updated_medicine
  description:  text('description'),
  ipAddress:    varchar('ip_address', { length: 45 }),
  userAgent:    text('user_agent'),
  metadata:     text('metadata'), // JSON string for additional data
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---------- System Settings ----------
export const systemSettings = pgTable('system_settings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  key:          varchar('key', { length: 100 }).unique().notNull(),
  value:        text('value'),
  description:  text('description'),
  updatedBy:    uuid('updated_by').references(() => users.id),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ---------- Backups ----------
export const backups = pgTable('backups', {
  id:           uuid('id').primaryKey().defaultRandom(),
  filename:     varchar('filename', { length: 255 }).notNull(),
  fileSize:     integer('file_size'), // in bytes
  filePath:     text('file_path'),
  status:       varchar('status', { length: 50 }).default('completed'), // completed, failed
  createdBy:    uuid('created_by').references(() => users.id),
  createdAt:    timestamp('created_at').defaultNow(),
});
