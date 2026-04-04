/**
 * ASM Seed Script — run AFTER database.sql
 * Usage: node backend/seed.js
 */
require('dotenv').config({ path: __dirname + '/.env' });
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'asm_rbac',
    multipleStatements: true,
  });

  console.log('✅ Connected to DB:', process.env.DB_NAME || 'asm_rbac');

  // ── Users ───────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const empHash   = await bcrypt.hash('Admin@123',   10);

  await conn.execute(`
    INSERT IGNORE INTO users (name, email, password, role)
    VALUES
      ('Admin User',  'admin@ajanthasilk.com', ?, 'admin'),
      ('Demo Employee', 'employee@ajanthasilk.com', ?, 'employee')
  `, [adminHash, empHash]);

  // ── Permissions for demo employee ───────────────────────────
  const [[emp]] = await conn.execute("SELECT id FROM users WHERE email='employee@ajanthasilk.com'");
  if (emp) {
    const modules = ['customer_po','inward','outward','jobwork','sales','enquiry','return','sampling','master_data','orders_cpo','orders_spo','orders_jpo'];
    for (const m of modules) {
      await conn.execute(`
        INSERT INTO permissions (user_id, module_name, can_view, can_add, can_edit, can_delete)
        VALUES (?, ?, 1, 1, 0, 0)
        ON DUPLICATE KEY UPDATE can_view=1, can_add=1, can_edit=0, can_delete=0
      `, [emp.id, m]);
    }
    console.log('✅ Employee permissions set (view + add only by default)');
  }

  // ── Master Data: Firms ───────────────────────────────────────
  const firms = [
    ['Ajantha Silk Mills', 'ASM', '9876543210', 'Surat'],
    ['Ajantha Silk',       'AS',  '9876543211', 'Surat'],
    ['Ajantha Export',     'AE',  '9876543212', 'Mumbai'],
  ];
  for (const [name, prefix, phone, city] of firms) {
    await conn.execute(
      `INSERT IGNORE INTO master_firms (name, prefix, phone, city) VALUES (?,?,?,?)`,
      [name, prefix, phone, city]
    );
  }

  // ── Master Data: Qualities ───────────────────────────────────
  const qualities = ['Cotton Plain', 'Polyester Blend', 'Silk Pure', 'Linen Cotton', 'Rayon Soft'];
  for (const q of qualities) {
    await conn.execute(`INSERT IGNORE INTO master_qualities (name) VALUES (?)`, [q]);
  }

  // ── Master Data: Customers ───────────────────────────────────
  const customers = [
    ['Ravi Textiles', 30, '9988776655', 'Ahmedabad'],
    ['Suresh Fabrics', 45, '9977665544', 'Surat'],
    ['Meena Traders',  60, '9966554433', 'Mumbai'],
  ];
  for (const [name, days, phone, city] of customers) {
    await conn.execute(
      `INSERT IGNORE INTO master_customers (name, credit_days, phone, city) VALUES (?,?,?,?)`,
      [name, days, phone, city]
    );
  }

  // ── Master Data: Mills ───────────────────────────────────────
  const mills = ['Raj Weaving Mill', 'Shree Textile Mill', 'Om Fabrics'];
  for (const m of mills) {
    await conn.execute(`INSERT IGNORE INTO master_mills (name) VALUES (?)`, [m]);
  }

  // ── Master Data: Suppliers ───────────────────────────────────
  const suppliers = ['Raj Yarn Supplier', 'Bharat Textiles', 'Sunrise Fabrics'];
  for (const s of suppliers) {
    await conn.execute(`INSERT IGNORE INTO master_suppliers (name) VALUES (?)`, [s]);
  }

  // ── Master Data: Merchants ───────────────────────────────────
  const merchants = ['Kapil Merchant', 'Sunil Traders'];
  for (const m of merchants) {
    await conn.execute(`INSERT IGNORE INTO master_merchants (name) VALUES (?)`, [m]);
  }

  // ── Master Data: Followupers ─────────────────────────────────
  const followups = [
    ['Priya Sharma', '9111222333', 'Sales'],
    ['Raj Patel',    '9333444555', 'Operations'],
  ];
  for (const [name, phone, dept] of followups) {
    await conn.execute(
      `INSERT IGNORE INTO master_followups (name, phone, department) VALUES (?,?,?)`,
      [name, phone, dept]
    );
  }

  // ── Master Data: Statuses ────────────────────────────────────
  const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  for (const s of statuses) {
    await conn.execute(`INSERT IGNORE INTO master_statuses (name) VALUES (?)`, [s]);
  }

  // ── Master Data: Work Types ──────────────────────────────────
  const workTypes = ['Job Work', 'Own Work', 'Trading'];
  for (const w of workTypes) {
    await conn.execute(`INSERT IGNORE INTO master_work_types (name) VALUES (?)`, [w]);
  }

  // ── Master Data: Buyers ──────────────────────────────────────
  const buyers = [
    ['Amit Buyer',  '9444555666', 'Delhi'],
    ['Nisha Buyer', '9555666777', 'Jaipur'],
  ];
  for (const [name, phone, city] of buyers) {
    await conn.execute(
      `INSERT IGNORE INTO master_buyers (name, phone, city) VALUES (?,?,?)`,
      [name, phone, city]
    );
  }

  // ── CPO Sequence for current year ───────────────────────────
  const year = new Date().getFullYear();
  await conn.execute(
    `INSERT IGNORE INTO cpo_sequence (year, last_number) VALUES (?, 0)`, [year]
  );

  // ── SPO / JPO sequences (from database_additions.sql) ───────
  // Only insert if tables exist (database_additions.sql was run)
  try {
    await conn.execute(`INSERT IGNORE INTO spo_sequence (year, last_number) VALUES (?, 0)`, [year]);
    await conn.execute(`INSERT IGNORE INTO jpo_sequence (year, last_number) VALUES (?, 0)`, [year]);
    console.log('✅ SPO/JPO sequences initialized');
  } catch(e) {
    console.log('⚠️  SPO/JPO sequence tables not found — run database_additions.sql first');
  }

  console.log('✅ Master data seeded');
  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log('  SEED COMPLETE — Login credentials:');
  console.log('  Admin:    admin@ajanthasilk.com    / Admin@123');
  console.log('  Employee: employee@ajanthasilk.com / Admin@123');
  console.log('─────────────────────────────────────────────');

  await conn.end();
}

run().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
