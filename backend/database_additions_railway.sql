-- ASM Railway Additions SQL
-- Run AFTER database_railway.sql

-- ============================================================
-- ASM v5 — CPO / SPO / JPO  Additional Tables
-- Run AFTER main database.sql:
--   mysql -u root -p asm_rbac < backend/database_additions.sql
-- ============================================================

-- ── CPO Order Sequence (per prefix per year) ─────────────────
CREATE TABLE IF NOT EXISTS cpo_order_seq (
  year        INT NOT NULL,
  prefix      VARCHAR(10) NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (year, prefix)
);

-- ── CPO Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cpo_orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_no        VARCHAR(30) NOT NULL UNIQUE,
  selling_firm    VARCHAR(100),
  firm_prefix     VARCHAR(10),
  customer_name   VARCHAR(200),
  followup_person VARCHAR(200),
  merchant        VARCHAR(200),
  mill_name       VARCHAR(200),
  weaver_name     VARCHAR(200),
  po_date         DATE,
  delivery_date   DATE,
  created_by      INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_order_no   (order_no),
  INDEX idx_customer   (customer_name),
  INDEX idx_created_at (created_at)
);

-- ── CPO SKUs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cpo_skus (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cpo_id      INT NOT NULL,
  quality     VARCHAR(200),
  color       VARCHAR(100),
  fabric_type VARCHAR(100),
  width       VARCHAR(50),
  gsm         VARCHAR(50),
  finish_qty  DECIMAL(10,2) NOT NULL DEFAULT 0,
  grey_qty    DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate        DECIMAL(10,2) NOT NULL DEFAULT 0,
  sku_label   VARCHAR(400),
  sort_order  INT NOT NULL DEFAULT 0,
  FOREIGN KEY (cpo_id) REFERENCES cpo_orders(id) ON DELETE CASCADE
);

-- ── SPO (Supplier PO) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spo_sequence (
  year        INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spo_orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  spo_number    VARCHAR(30) NOT NULL UNIQUE,
  cpo_id        INT,
  cpo_no        VARCHAR(30),
  supplier_name VARCHAR(200),
  merchant      VARCHAR(200),
  spo_date      DATE,
  delivery_date DATE,
  rate          DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_spo_number (spo_number),
  INDEX idx_cpo_id     (cpo_id)
);

CREATE TABLE IF NOT EXISTS spo_skus (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  spo_id   INT NOT NULL,
  sku_id   INT NOT NULL,
  grey_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate     DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (spo_id) REFERENCES spo_orders(id) ON DELETE CASCADE
);

-- ── JPO (Jobwork PO) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jpo_sequence (
  year        INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jpo_orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  jpo_number     VARCHAR(30) NOT NULL UNIQUE,
  cpo_id         INT,
  cpo_no         VARCHAR(30),
  jobworker_name VARCHAR(200),
  process_type   VARCHAR(100),
  jpo_date       DATE,
  delivery_date  DATE,
  rate           DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_jpo_number (jpo_number),
  INDEX idx_cpo_id     (cpo_id)
);

CREATE TABLE IF NOT EXISTS jpo_skus (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  jpo_id     INT NOT NULL,
  sku_id     INT NOT NULL,
  finish_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  grey_qty   DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate       DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (jpo_id) REFERENCES jpo_orders(id) ON DELETE CASCADE
);

-- Seed sequence rows for current year
INSERT IGNORE INTO spo_sequence (year, last_number) VALUES (YEAR(CURDATE()), 0);
INSERT IGNORE INTO jpo_sequence (year, last_number) VALUES (YEAR(CURDATE()), 0);
