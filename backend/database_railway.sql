-- ASM Railway MySQL Schema
-- Paste this in Railway → MySQL → Database tab → Query

-- ============================================================
-- ASM Role-Based Company Management System — v4
-- Database Schema — Run this ONCE to set up MySQL
-- ============================================================
-- Command: mysql -u root -p < database.sql
-- ============================================================


-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── PERMISSIONS (granular: view/add/edit/delete per module) ──
CREATE TABLE IF NOT EXISTS permissions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  module_name VARCHAR(50) NOT NULL,
  can_view    TINYINT(1) NOT NULL DEFAULT 0,
  can_add     TINYINT(1) NOT NULL DEFAULT 0,
  can_edit    TINYINT(1) NOT NULL DEFAULT 0,
  can_delete  TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_module (user_id, module_name)
);

-- ── CPO SEQUENCE (global counter for CPO numbers) ────────────
CREATE TABLE IF NOT EXISTS cpo_sequence (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  last_number  INT NOT NULL DEFAULT 0,
  year         INT NOT NULL,
  UNIQUE KEY uq_year (year)
);

-- ── CUSTOMER PO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_po (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  cpo_number     VARCHAR(50) DEFAULT NULL,
  po_number      VARCHAR(50) NOT NULL UNIQUE,
  po_date        DATE NOT NULL,
  customer_name  VARCHAR(150) NOT NULL,
  selling_firm   VARCHAR(150),
  quality_name   VARCHAR(100),
  finish_qty     DECIMAL(10,2) DEFAULT 0,
  greige_qty     DECIMAL(10,2) DEFAULT 0,
  delivery_date  DATE,
  merchant_name  VARCHAR(100),
  followuper     VARCHAR(100),
  color          VARCHAR(50),
  width          VARCHAR(30),
  gsm            VARCHAR(20)  DEFAULT NULL,
  fabric_type    VARCHAR(50)  DEFAULT NULL,
  mill_name      VARCHAR(150) DEFAULT NULL,
  weaver_name    VARCHAR(150) DEFAULT NULL,
  status         ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  notes          TEXT,
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── INWARD (GREIGE) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inward (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  bill_no       VARCHAR(50),
  inward_date   DATE NOT NULL,
  firm_name     VARCHAR(150),
  party_name    VARCHAR(150) NOT NULL,
  quality_name  VARCHAR(100),
  pieces        INT DEFAULT 0,
  grey_meter    DECIMAL(10,2) DEFAULT 0,
  rate          DECIMAL(10,2) DEFAULT 0,
  amount        DECIMAL(12,2) DEFAULT 0,
  lot_no        VARCHAR(50),
  width         VARCHAR(30),
  po_reference  VARCHAR(50),
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── OUTWARD (GREIGE) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outward (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  chalan_no     VARCHAR(50),
  chalan_date   DATE NOT NULL,
  firm_name     VARCHAR(150),
  mill_name     VARCHAR(150),
  quality_name  VARCHAR(100),
  pieces        INT DEFAULT 0,
  grey_meter    DECIMAL(10,2) DEFAULT 0,
  width         VARCHAR(30),
  po_reference  VARCHAR(50),
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── JOBWORK ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobwork (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  jw_date       DATE NOT NULL,
  mill_name     VARCHAR(150),
  bill_no       VARCHAR(50),
  quality_name  VARCHAR(100),
  firm_name     VARCHAR(150),
  pieces        INT DEFAULT 0,
  grey_meter    DECIMAL(10,2) DEFAULT 0,
  finish_meter  DECIMAL(10,2) DEFAULT 0,
  rate          DECIMAL(10,2) DEFAULT 0,
  amount        DECIMAL(12,2) DEFAULT 0,
  po_reference  VARCHAR(50),
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── SALES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no    VARCHAR(50) NOT NULL UNIQUE,
  bill_date     DATE NOT NULL,
  firm_name     VARCHAR(150),
  buyer_name    VARCHAR(150) NOT NULL,
  bales         INT DEFAULT 0,
  meters        DECIMAL(10,2) DEFAULT 0,
  rate          DECIMAL(10,2) DEFAULT 0,
  total_amount  DECIMAL(12,2) DEFAULT 0,
  merchant_name VARCHAR(100),
  work_type     VARCHAR(50),
  city          VARCHAR(100),
  transport     VARCHAR(100),
  po_reference  VARCHAR(50),
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── ENQUIRY ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiry (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  enquiry_date   DATE NOT NULL,
  customer_name  VARCHAR(150) NOT NULL,
  quality_name   VARCHAR(100),
  quantity       DECIMAL(10,2) DEFAULT 0,
  requirement    TEXT,
  status         ENUM('new','follow_up','converted','closed') DEFAULT 'new',
  followup_date  DATE,
  assigned_to    VARCHAR(100),
  notes          TEXT,
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── RETURNS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  return_date   DATE NOT NULL,
  party_name    VARCHAR(150) NOT NULL,
  invoice_ref   VARCHAR(50),
  quality_name  VARCHAR(100),
  pieces        INT DEFAULT 0,
  meters        DECIMAL(10,2) DEFAULT 0,
  reason        TEXT,
  status        ENUM('pending','approved','rejected','processed') DEFAULT 'pending',
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── SAMPLING ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sampling (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  sample_date    DATE NOT NULL,
  customer_name  VARCHAR(150) NOT NULL,
  quality_name   VARCHAR(100),
  meters         DECIMAL(10,2) DEFAULT 0,
  color          VARCHAR(50),
  design         VARCHAR(100),
  status         ENUM('sent','approved','rejected','pending') DEFAULT 'pending',
  feedback       TEXT,
  notes          TEXT,
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── MASTER DATA TABLES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_customers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  credit_days INT DEFAULT 30,
  phone       VARCHAR(20),
  city        VARCHAR(100),
  is_active   TINYINT(1) DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_qualities (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL UNIQUE,
  shrinkage_pct  DECIMAL(5,2) DEFAULT 5.00,
  description    TEXT,
  is_active      TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_mills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  city       VARCHAR(100),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_suppliers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  city       VARCHAR(100),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_merchants (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_followups (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  department VARCHAR(100),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_firms (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  prefix     VARCHAR(20)  NOT NULL DEFAULT '',
  phone      VARCHAR(20),
  city       VARCHAR(100),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master Data for Status, Work Type, Buyer
CREATE TABLE IF NOT EXISTS master_statuses (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_work_types (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_buyers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  city       VARCHAR(100),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── LOCATION LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  latitude     DECIMAL(10,8) NOT NULL,
  longitude    DECIMAL(11,8) NOT NULL,
  address      TEXT,
  house_no     VARCHAR(100),
  street       VARCHAR(200),
  city         VARCHAR(100),
  state        VARCHAR(100),
  pincode      VARCHAR(20),
  capture_type ENUM('login','11am','730pm','manual') DEFAULT 'login',
  captured_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, captured_at)
);

-- ── Seed initial year in cpo_sequence ────────────────────────
INSERT IGNORE INTO cpo_sequence (year, last_number) VALUES (YEAR(NOW()), 0);

-- ── After running this SQL, run: node backend/seed.js ────────
