require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL||'http://localhost:5173', credentials:true }));
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));

// Request logging disabled — terminal stays clean
// To re-enable: uncomment the line below
// app.use((req,_,next)=>{ console.log(`${req.method} ${req.path}`); next(); });

app.use('/api', routes);
app.get('/health', (_,res)=>res.json({ status:'ok', time:new Date().toISOString() }));
app.use((_,res)=>res.status(404).json({ success:false, message:'Not found' }));
app.use((e,_,res,__)=>{ console.error(e); res.status(500).json({ success:false, message:'Server error' }); });

app.listen(PORT, ()=>{
  console.log(`\n🚀 ASM RBAC Server → http://localhost:${PORT}`);
  console.log(`📡 API Base       → http://localhost:${PORT}/api\n`);
});
