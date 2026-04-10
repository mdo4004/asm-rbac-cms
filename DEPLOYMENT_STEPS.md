# ASM RBAC CMS — Deployment Steps

## Quick Summary
- Frontend: Vercel (free)
- Backend: Railway (free $5/month credit)  
- Database: Railway MySQL (included)

## Railway Environment Variables (copy exactly)
```
PORT=5000
NODE_ENV=production
DB_HOST=mysql.railway.internal
DB_USER=root
DB_PASSWORD=<from Railway MySQL Variables tab>
DB_NAME=railway
DB_PORT=3306
JWT_SECRET=AjanthaSilkMills_SuperSecret_2024_ASM_RBAC
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://asm-rbac-cms.vercel.app
```

## Vercel Environment Variable
```
VITE_API_URL=https://your-backend.up.railway.app/api
```

## Login Credentials
- Admin: admin@ajanthasilk.com / Admin@123
- Employee: employee@ajanthasilk.com / Admin@123

## Database Setup Order
1. Run `database_railway.sql` in Railway MySQL query tab
2. Run `database_additions_railway.sql` in Railway MySQL query tab  
3. Railway will auto-seed users when backend starts

## Common Issues Fixed in This Version
- ✅ CORS accepts all vercel.app domains
- ✅ LIMIT/OFFSET MySQL bug fixed (data now shows)
- ✅ Mobile responsive (sidebar hamburger menu)
- ✅ Page refresh 404 fixed (vercel.json)
- ✅ DB_PORT support for Railway MySQL
- ✅ iOS input zoom fix (font-size: 16px)
