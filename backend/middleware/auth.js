const jwt = require('jsonwebtoken');
const db  = require('../config/db');

// ── 1. Verify JWT ─────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success:false, message:'No token provided' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.execute(
      'SELECT id,name,email,role,is_active FROM users WHERE id=?', [decoded.id]
    );
    if (!rows.length || !rows[0].is_active)
      return res.status(401).json({ success:false, message:'User inactive or not found' });

    req.user = rows[0];
    next();
  } catch (e) {
    const msg = e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success:false, message: msg });
  }
};

// ── 2. Require Admin ──────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success:false, message:'Admin access required' });
  next();
};

// ── 3. Check Module Permission (granular action) ──────────────
// action = 'view' | 'add' | 'edit' | 'delete'
const checkPermission = (module, action = 'view') => async (req, res, next) => {
  if (req.user?.role === 'admin') return next(); // admin always passes

  const [rows] = await db.execute(
    'SELECT can_view, can_add, can_edit, can_delete FROM permissions WHERE user_id=? AND module_name=?',
    [req.user.id, module]
  );

  if (!rows.length) {
    return res.status(403).json({ success:false, message:`No access to module: ${module}` });
  }

  const perm = rows[0];
  const actionMap = { view:'can_view', add:'can_add', edit:'can_edit', delete:'can_delete' };
  const col = actionMap[action] || 'can_view';

  if (!perm[col]) {
    return res.status(403).json({ success:false, message:`No ${action} permission for: ${module}` });
  }

  next();
};

module.exports = { verifyToken, requireAdmin, checkPermission };
