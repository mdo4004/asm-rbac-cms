# ASM RBAC CMS — Setup Guide (v4-fixed-2)

## What Was Fixed

### 🔴 Bug Fix #1: Login Does Nothing (NEW in this version)
**Root Cause (two problems combined):**

1. **`seed.js` credentials didn't match the Login page demo credentials**
   - `seed.js` was creating `admin@asm.com / admin123`
   - `LoginPage.jsx` showed demo credentials as `admin@ajanthasilk.com / Admin@123`
   - Result: typing the shown demo credentials always returned 401

2. **Axios 401 interceptor caused a silent page reload on login failure**
   - When login failed with a 401, `axios.js` called `window.location.href = '/login'`
   - This reloaded the page before the error toast could display
   - So clicking Login appeared to do absolutely nothing

**Fixes:**
- `backend/seed.js` — updated credentials to `admin@ajanthasilk.com / Admin@123` and `employee@ajanthasilk.com / Admin@123`
- `frontend/src/api/axios.js` — 401 interceptor now skips the redirect when already on the `/login` page, so the error toast shows correctly

---

### 🔴 Bug Fix #2: Employee Panel Infinite Loading (previous version)
**Root Cause:** Token key mismatch between two files:
- `AuthContext.jsx` stored the JWT as `localStorage.setItem('token', ...)`
- `axios.js` read it as `localStorage.getItem('asm_token')` ← **wrong key**

**Fix:** `frontend/src/api/axios.js` — changed `asm_token` → `token` on both lines.

---

## Prerequisites
- **Node.js** v18 or higher
- **MySQL** 8.0 or higher
- **npm** v9+

---

## Step 1 — Configure Database Credentials

Edit `backend/.env` and fill in your MySQL password:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE   ← change this
DB_NAME=asm_rbac
JWT_SECRET=asm_rbac_super_secret_2024_change_this
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## Step 2 — Create Database and Import Schema

```sql
-- In MySQL client / MySQL Workbench:
CREATE DATABASE asm_rbac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then import the schema:
```bash
mysql -u root -p asm_rbac < backend/database.sql
```

---

## Step 3 — Seed Demo Data

```bash
cd backend
node seed.js
```

✅ This creates:
- **Admin:** `admin@ajanthasilk.com` / `Admin@123`
- **Employee:** `employee@ajanthasilk.com` / `Admin@123`

---

## Step 4 — Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (open a new terminal)
cd frontend
npm install
```

---

## Step 5 — Start Both Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev      # uses nodemon (auto-restart on changes)
# or:
node server.js
```

You should see:
```
✅ MySQL connected → asm_rbac
🚀 ASM RBAC Server → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## Login Credentials

| Role     | Email                          | Password   |
|----------|--------------------------------|------------|
| Admin    | admin@ajanthasilk.com          | Admin@123  |
| Employee | employee@ajanthasilk.com       | Admin@123  |

---

## Troubleshooting

### "Nothing happens when I click Login"
- Make sure `backend/.env` has your correct MySQL password
- Make sure the backend server is running (`node server.js` in `/backend`)
- Make sure you ran `node seed.js` to create the users
- Use the exact credentials from the table above

### "MySQL connection FAILED"
- Edit `backend/.env` and set the correct `DB_PASSWORD`
- Make sure MySQL is running (`sudo service mysql start` on Linux)
- Make sure the `asm_rbac` database was created

### "EADDRINUSE: port 5000 already in use"
- Another process is on port 5000. Either kill it or change `PORT` in `backend/.env`

### Vite proxy errors (CORS)
- The frontend uses Vite's dev proxy — `baseURL: '/api'` → `http://localhost:5000/api`
- The backend MUST be running on port 5000 for this to work
- Do NOT open the frontend from port 5000; always use **http://localhost:5173**

---

## Project Structure

```
asm-v4-fixed/
├── backend/
│   ├── config/db.js              # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js     # Login, /me, password change
│   │   ├── moduleController.js   # CRUD for all business modules
│   │   ├── masterController.js   # Master data CRUD + pagination
│   │   ├── userController.js     # Admin: manage employees
│   │   ├── locationController.js # GPS tracking
│   │   └── profileController.js  # Self-service profile
│   ├── middleware/auth.js        # JWT verify, role check, permission check
│   ├── routes/index.js           # All API routes
│   ├── server.js                 # Express entry point
│   ├── database.sql              # Schema
│   ├── seed.js                   # ✅ FIXED: credentials now match Login page
│   └── .env                      # ← Edit this with your MySQL password
│
└── frontend/
    └── src/
        ├── api/axios.js          # ✅ FIXED: 401 redirect skip on login page
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── auth/LoginPage.jsx
        │   ├── admin/
        │   │   ├── AdminModule.jsx
        │   │   ├── Dashboard.jsx
        │   │   ├── ManageUsers.jsx
        │   │   └── LocationTrack.jsx
        │   └── employee/
        │       ├── ModulePage.jsx
        │       └── Dashboard.jsx
        ├── components/
        │   ├── layout/AdminLayout.jsx
        │   ├── layout/EmployeeLayout.jsx
        │   └── ProfileModal.jsx
        └── App.jsx
```
