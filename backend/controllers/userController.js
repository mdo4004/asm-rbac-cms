const bcrypt = require('bcryptjs');
const db     = require('../config/db');

const ALL_MODULES = [
  'customer_po','inward','outward','jobwork',
  'sales','enquiry','return','sampling','master_data',
  'orders_cpo','orders_spo','orders_jpo'
];

const defaultPerm = () => ({ can_view:0, can_add:0, can_edit:0, can_delete:0 });

// GET /api/users
exports.getAll = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,
              GROUP_CONCAT(CASE WHEN p.can_view=1 THEN p.module_name END) AS allowed_modules
       FROM users u
       LEFT JOIN permissions p ON u.id=p.user_id
       WHERE u.id != ?
       GROUP BY u.id ORDER BY u.created_at DESC`,
      [req.user.id]
    );
    res.json({ success:true, users });
  } catch (e) { res.status(500).json({ success:false, message:'Server error' }); }
};

// GET /api/users/:id
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id,name,email,role,is_active,created_at FROM users WHERE id=?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'User not found' });

    const [perms] = await db.execute(
      'SELECT module_name, can_view, can_add, can_edit, can_delete FROM permissions WHERE user_id=?',
      [req.params.id]
    );

    // Build permissions object: { module_name: { can_view, can_add, can_edit, can_delete } }
    const permissions = {};
    ALL_MODULES.forEach(m => (permissions[m] = defaultPerm()));
    perms.forEach(p => {
      permissions[p.module_name] = {
        can_view:   Boolean(p.can_view),
        can_add:    Boolean(p.can_add),
        can_edit:   Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
      };
    });

    res.json({ success:true, user:{ ...rows[0], permissions } });
  } catch (e) { res.status(500).json({ success:false, message:'Server error' }); }
};

// POST /api/users
exports.create = async (req, res) => {
  try {
    const { name, email, password, permissions={} } = req.body;
    if (!name||!email||!password)
      return res.status(400).json({ success:false, message:'Name, email, password required' });

    const [exists] = await db.execute('SELECT id FROM users WHERE email=?', [email.toLowerCase()]);
    if (exists.length) return res.status(409).json({ success:false, message:'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
      [name.trim(), email.toLowerCase(), hash, 'employee']
    );
    const uid = result.insertId;

    // Insert granular permissions
    for (const m of ALL_MODULES) {
      const p = permissions[m] || defaultPerm();
      await db.execute(
        `INSERT INTO permissions (user_id,module_name,can_view,can_add,can_edit,can_delete)
         VALUES (?,?,?,?,?,?)`,
        [uid, m, p.can_view?1:0, p.can_add?1:0, p.can_edit?1:0, p.can_delete?1:0]
      );
    }

    res.status(201).json({ success:true, message:'Employee created', id:uid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// PUT /api/users/:id
exports.update = async (req, res) => {
  try {
    const { name, email, password, is_active } = req.body;
    const { id } = req.params;
    let q = 'UPDATE users SET name=?,email=?,is_active=?';
    let p = [name, email.toLowerCase(), is_active ?? 1];
    if (password) { const h = await bcrypt.hash(password,10); q+=',password=?'; p.push(h); }
    q += ' WHERE id=?'; p.push(id);
    await db.execute(q, p);
    res.json({ success:true, message:'Updated' });
  } catch (e) { res.status(500).json({ success:false, message:'Server error' }); }
};

// DELETE /api/users/:id
exports.remove = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT role FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    if (rows[0].role==='admin') return res.status(400).json({ success:false, message:'Cannot delete admin' });
    await db.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success:true, message:'Deleted' });
  } catch (e) { res.status(500).json({ success:false, message:'Server error' }); }
};

// PUT /api/users/:id/permissions
exports.updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const { id } = req.params;
    const [rows] = await db.execute('SELECT role FROM users WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    if (rows[0].role==='admin') return res.status(400).json({ success:false, message:'Admin has all perms' });

    for (const m of ALL_MODULES) {
      const p = permissions[m] || defaultPerm();
      await db.execute(
        `INSERT INTO permissions (user_id,module_name,can_view,can_add,can_edit,can_delete)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           can_view=VALUES(can_view),can_add=VALUES(can_add),
           can_edit=VALUES(can_edit),can_delete=VALUES(can_delete)`,
        [id, m, p.can_view?1:0, p.can_add?1:0, p.can_edit?1:0, p.can_delete?1:0]
      );
    }
    res.json({ success:true, message:'Permissions updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// PATCH /api/users/:id/toggle
exports.toggle = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT is_active FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    const next = rows[0].is_active ? 0 : 1;
    await db.execute('UPDATE users SET is_active=? WHERE id=?', [next, req.params.id]);
    res.json({ success:true, is_active:next });
  } catch (e) { res.status(500).json({ success:false, message:'Server error' }); }
};
