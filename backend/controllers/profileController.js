const bcrypt = require('bcryptjs');
const db     = require('../config/db');

// GET /api/profile/me
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    // Latest location
    const [loc] = await db.execute(
      'SELECT * FROM location_logs WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1',
      [req.user.id]
    );

    res.json({ success: true, user: rows[0], location: loc[0] || null });
  } catch (e) {
    console.error('profileController.getMe:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/profile/me
// - Admin: can update name, email, password
// - Employee: profile is READ-ONLY via this route (403 on write)
exports.updateMe = async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({
        success: false,
        message: 'Only admin can edit profile. Contact your admin to change credentials.'
      });

    const { name, email, currentPassword, newPassword } = req.body;
    if (!name || !email)
      return res.status(400).json({ success: false, message: 'Name and email are required' });

    // Check email not taken by another user
    const [exists] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.toLowerCase(), req.user.id]
    );
    if (exists.length)
      return res.status(409).json({ success: false, message: 'Email already in use' });

    let q = 'UPDATE users SET name = ?, email = ?';
    let p = [name.trim(), email.toLowerCase()];

    // Password change (optional, admin only)
    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ success: false, message: 'Current password required to set new password' });

      const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
      const ok = await bcrypt.compare(currentPassword, rows[0].password);
      if (!ok)
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });

      const hash = await bcrypt.hash(newPassword, 10);
      q += ', password = ?';
      p.push(hash);
    }

    q += ' WHERE id = ?';
    p.push(req.user.id);

    await db.execute(q, p);

    const [updated] = await db.execute(
      'SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]
    );
    res.json({ success: true, user: updated[0], message: 'Profile updated' });
  } catch (e) {
    console.error('profileController.updateMe:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
