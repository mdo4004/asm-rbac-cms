require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 5000;

// Allow localhost (dev) + any Vercel URL + custom FRONTEND_URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    // Allow any vercel.app domain for this project
    if (origin.includes('vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use((_, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((e, _, res, __) => {
  console.error(e.message);
  res.status(500).json({ success: false, message: e.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ASM RBAC Server → http://localhost:${PORT}`);
  console.log(`📡 API Base       → http://localhost:${PORT}/api\n`);
});
