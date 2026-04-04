# ASM RBAC CMS v5 — How to Run

## Prerequisites
- Node.js (v18+)
- MySQL (v8+)
- npm

---

## Step 1: Setup MySQL Database

Open MySQL and run these commands in order:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS asm_rbac;
```

Then run the SQL files:
```bash
mysql -u root -p asm_rbac < backend/database.sql
mysql -u root -p asm_rbac < backend/database_additions.sql
```

---

## Step 2: Configure Environment

Edit `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=asm_rbac
JWT_SECRET=asm_secret_key_2026
PORT=5000
```

---

## Step 3: Seed Initial Data

```bash
cd backend
node seed.js
```

This creates:
- Admin user: `admin@ajanthasilk.com` / `Admin@123`
- Employee user: `employee@ajanthasilk.com` / `Admin@123`
- Sample master data (firms, customers, mills, etc.)

---

## Step 4: Start Backend

```bash
cd backend
npm install
node server.js
```

Server runs on: http://localhost:5000

---

## Step 5: Start Frontend

Open a NEW terminal:
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Step 6: Open in Browser

Go to: **http://localhost:5173**

Login with:
- **Admin:** admin@ajanthasilk.com / Admin@123
- **Employee:** employee@ajanthasilk.com / Admin@123

---

## Features

### Sidebar Navigation (Admin)
- **Dashboard** — overview stats
- **Manage Users** — create employees with per-module permissions
- **Location Track** — view employee GPS locations
- **Orders → Customer PO** — create CPO with multi-SKU, auto order number
- **Orders → Supplier PO** — 3-step workflow, grey qty editable
- **Orders → Jobwork PO** — 3-step workflow, both qty editable, red theme
- **Inward / Outward / Jobwork / Sales / Enquiry / Returns / Sampling**
- **Master Data** — manage firms, customers, qualities, mills, merchants etc.

### Employee Panel
- Same CPO/SPO/JPO pages (shown only if admin grants permission)
- Per-module access controlled by admin

### PDF Generation
- CPO, SPO, JPO each generate print-ready HTML PDFs
- Click the **📄 PDF** button in the list table
- Browser print dialog opens — use "Save as PDF"

### Permissions (Admin can set per employee)
- Customer PO, CPO (New), Supplier PO, Jobwork PO
- Inward, Outward, Jobwork, Sales, Enquiry, Returns, Sampling
- Master Data

---

## Troubleshooting

**Dropdowns empty in CPO/SPO/JPO forms?**
→ Run `node seed.js` to populate master data

**PDF not opening?**
→ Allow popups in your browser for localhost:5173

**Login fails?**
→ Check `.env` DB_PASSWORD matches your MySQL password

**Cannot connect to database?**
→ Make sure MySQL is running and `asm_rbac` database exists
