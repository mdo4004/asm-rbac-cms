# ASM RBAC — Ajantha Silk Mills Company Management System

A full-stack Role-Based Access Control (RBAC) CMS built with:
- Backend: Node.js + Express + MySQL
- Frontend: React + Vite + Tailwind CSS

---

## Project Structure

```
asm-rbac/
├── backend/          <- Node.js/Express API server
│   ├── config/       <- DB connection
│   ├── controllers/  <- Route logic
│   ├── middleware/   <- JWT auth middleware
│   ├── routes/       <- API route definitions
│   ├── .env          <- EDIT THIS with your DB password
│   ├── database.sql  <- Run this first (creates tables)
│   ├── seed.js       <- Run this second (creates demo users)
│   ├── server.js     <- App entry point
│   └── package.json
└── frontend/         <- React/Vite app
    └── src/
```

---

## Prerequisites

- Node.js 18+ → https://nodejs.org
- MySQL 5.7 or 8.x → https://dev.mysql.com/downloads/

---

## Setup (Follow in order)

### 1. Import the database

```bash
mysql -u root -p < backend/database.sql
```

### 2. Set your MySQL password in .env

Edit backend/.env:
```
DB_PASSWORD=your_mysql_password_here
```
(Leave blank if MySQL has no password: DB_PASSWORD=)

### 3. Install backend packages

```bash
cd backend
npm install
```

### 4. Seed demo users (FIXES LOGIN)

```bash
node seed.js
```

Expected output:
```
✅ Admin user created  → admin@ajanthasilk.com / Admin@123
✅ Employee user created → employee@ajanthasilk.com / Admin@123
✅ Employee permissions set
```

### 5. Start backend

```bash
npm start
```

Keep this terminal open. Should show:
```
✅ MySQL connected → asm_rbac
🚀 ASM RBAC Server → http://localhost:5000
```

### 6. Install & start frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

### 7. Open browser

Go to: http://localhost:5173

---

## Login Credentials

| Role     | Email                        | Password  |
|----------|------------------------------|-----------|
| Admin    | admin@ajanthasilk.com        | Admin@123 |
| Employee | employee@ajanthasilk.com     | Admin@123 |

---

## Troubleshooting

**Login fails?**
→ Did you run `node seed.js`? (Step 4) — This is the most common cause.
→ Is backend running? Check terminal shows port 5000.

**MySQL connection error?**
→ Check DB_PASSWORD in backend/.env matches your MySQL password.
→ Test manually: mysql -u root -p asm_rbac

**Port already in use?**
→ Change PORT=5001 in backend/.env
→ Update vite.config.js proxy target to http://localhost:5001
