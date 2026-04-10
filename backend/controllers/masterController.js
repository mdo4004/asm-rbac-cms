const db = require('../config/db');

const TYPES = {
  customers:  { table:'master_customers',  fields:['name','credit_days','phone','city'] },
  qualities:  { table:'master_qualities',  fields:['name','shrinkage_pct','description'] },
  mills:      { table:'master_mills',      fields:['name','phone','city'] },
  suppliers:  { table:'master_suppliers',  fields:['name','phone','city'] },
  merchants:  { table:'master_merchants',  fields:['name','phone'] },
  followups:  { table:'master_followups',  fields:['name','phone','department'] },
  firms:      { table:'master_firms',      fields:['name','prefix','phone','city'] },
  statuses:   { table:'master_statuses',   fields:['name'] },
  work_types: { table:'master_work_types', fields:['name'] },
  buyers:     { table:'master_buyers',     fields:['name','phone','city'] },
};

// GET paginated list for a type (with search)
exports.getAll = async (req, res) => {
  try {
    const c = TYPES[req.params.type];
    if (!c) return res.status(400).json({ success: false, message: 'Invalid type' });

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    let where = 'WHERE is_active=1';
    const params = [];
    if (search) {
      where += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const [rows] = await db.query(
      `SELECT * FROM ${c.table} ${where} ORDER BY name ASC LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM ${c.table} ${where}`, params
    );

    res.json({ success: true, data: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET all master data for dropdowns (no pagination — needs all records)
exports.getAllForDropdowns = async (req, res) => {
  try {
    const out = {};
    for (const [k, c] of Object.entries(TYPES)) {
      if (k === 'firms') {
        const [r] = await db.execute(
          `SELECT id, name, prefix FROM ${c.table} WHERE is_active=1 ORDER BY name`
        );
        out[k] = r;
      } else {
        const [r] = await db.execute(
          `SELECT id, name FROM ${c.table} WHERE is_active=1 ORDER BY name`
        );
        out[k] = r;
      }
    }
    res.json({ success: true, data: out });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// CREATE
exports.create = async (req, res) => {
  try {
    const c = TYPES[req.params.type];
    if (!c) return res.status(400).json({ success: false, message: 'Invalid type' });
    const data = {};
    c.fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (!data.name) return res.status(400).json({ success: false, message: 'Name required' });
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const [result] = await db.execute(
      `INSERT INTO ${c.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const c = TYPES[req.params.type];
    if (!c) return res.status(400).json({ success: false, message: 'Invalid type' });
    const data = {};
    c.fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (!Object.keys(data).length) return res.status(400).json({ success: false, message: 'No fields to update' });
    const cols = Object.keys(data);
    const vals = [...Object.values(data), req.params.id];
    await db.execute(
      `UPDATE ${c.table} SET ${cols.map(f => `${f} = ?`).join(', ')} WHERE id = ?`,
      vals
    );
    res.json({ success: true, message: 'Updated successfully' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE (soft)
exports.remove = async (req, res) => {
  try {
    const c = TYPES[req.params.type];
    if (!c) return res.status(400).json({ success: false, message: 'Invalid type' });
    await db.execute(`UPDATE ${c.table} SET is_active=0 WHERE id=?`, [req.params.id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Dashboard stats
exports.dashboardStats = async (req, res) => {
  try {
    const tables = ['customer_po','inward','outward','jobwork','sales','enquiry','returns','sampling'];
    const stats  = {};
    for (const t of tables) {
      const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM ${t}`);
      stats[t] = total;
    }
    res.json({ success: true, data: stats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Preview CPO number before creation
exports.previewCPO = async (req, res) => {
  try {
    const { firm_id } = req.query;
    const [firms] = await db.execute('SELECT name, prefix FROM master_firms WHERE id=?', [firm_id]);
    if (!firms.length) return res.status(404).json({ success: false, message: 'Firm not found' });
    const { name, prefix } = firms[0];
    const pfx  = prefix || 'ASM';
    const year = new Date().getFullYear();
    const [[{ seq }]] = await db.execute(
      'SELECT COUNT(*) + 1 AS seq FROM customer_po WHERE selling_firm=? AND YEAR(created_at)=?',
      [name, year]
    );
    const cpo_number = `${pfx}/${year}/${String(seq).padStart(4, '0')}`;
    res.json({ success: true, cpo_number });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
