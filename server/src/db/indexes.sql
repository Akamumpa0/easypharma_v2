-- EasyPharma Performance Indexes
-- Run manually via Neon SQL Editor or psql after migrations

-- Stock lookups (most frequent query: pharmacist views their stock)
CREATE INDEX IF NOT EXISTS idx_stock_medicines_user_id ON stock_medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_medicines_medicine_id ON stock_medicines(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_medicines_user_medicine ON stock_medicines(user_id, medicine_id);

-- Customer bills (billing history, reports)
CREATE INDEX IF NOT EXISTS idx_customer_bills_user_id ON customer_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_bills_created_at ON customer_bills(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_bills_user_created ON customer_bills(user_id, created_at);

-- Bill records (analytics joins)
CREATE INDEX IF NOT EXISTS idx_customer_bill_records_bill_id ON customer_bill_records(bill_id);
CREATE INDEX IF NOT EXISTS idx_customer_bill_records_medicine_id ON customer_bill_records(medicine_id);

-- Medicines (search, barcode scan)
CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON medicines(barcode);
CREATE INDEX IF NOT EXISTS idx_medicines_medicine_code ON medicines(medicine_code);
CREATE INDEX IF NOT EXISTS idx_medicines_general_name ON medicines USING gin(to_tsvector('english', general_name));
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);

-- Stock movements (timeline queries)
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine_id ON stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Activity logs (admin audit trail)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);

-- Notifications (unread count)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Daily reports (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date ON daily_reports(user_id, date);

-- Expenses (financial reports)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);

-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Batches
CREATE INDEX IF NOT EXISTS idx_batches_user_medicine ON batches(user_id, medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON batches(expiry_date);
