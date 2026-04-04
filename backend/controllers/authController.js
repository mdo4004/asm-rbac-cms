const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const ALL_MODULES = [
  'customer_po','inward','outward','jobwork',
  'sales','enquiry','return','sampling','master_data',
  'orders_cpo','orders_spo','orders_jpo'
];

const defaultPerm  = () => ({ can_view:false, can_add:false, can_edit:false, can_delete:false });
const adminPerm    = () => ({ can_view:true,  can_add:true,  can_edit:true,  can_delete:true });

const buildPermissions = (role, dbPerms) => {
  const permissions = {};
  ALL_MODULES.forEach(m => {
    permissions[m] = role === 'admin' ? adminPerm() : defaultPerm();
  });
  if (role !== 'admin') {
    dbPerms.forEach(p => {
      permissions[p.module_name] = {
        can_view:   Boolean(p.can_view),
        can_add:    Boolean(p.can_add),
        can_edit:   Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
      };
    });
  }
  return permissions;
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, message:'Email and password required' });

    const [users] = await db.execute(
      'SELECT * FROM users WHERE email=? AND is_active=1', [email.toLowerCase().trim()]
    );
    if (!users.length)
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    const user = users[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    const [perms] = await db.execute(
      'SELECT module_name, can_view, can_add, can_edit, can_delete FROM permissions WHERE user_id=?',
      [user.id]
    );
    const permissions = buildPermissions(user.role, perms);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id:user.id, name:user.name, email:user.email, role:user.role, permissions },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const [perms] = await db.execute(
      'SELECT module_name, can_view, can_add, can_edit, can_delete FROM permissions WHERE user_id=?',
      [req.user.id]
    );
    const permissions = buildPermissions(req.user.role, perms);
    res.json({ success:true, user:{ ...req.user, permissions } });
  } catch (e) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await db.execute('SELECT password FROM users WHERE id=?', [req.user.id]);
    const ok = await bcrypt.compare(currentPassword, rows[0].password);
    if (!ok) return res.status(400).json({ success:false, message:'Current password is wrong' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password=? WHERE id=?', [hash, req.user.id]);
    res.json({ success:true, message:'Password updated' });
  } catch (e) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};
