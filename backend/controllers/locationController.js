const db = require('../config/db');

// POST /api/location  — save a location capture
exports.save = async (req, res) => {
  try {
    const {
      latitude, longitude, address,
      house_no, street, city, state, pincode,
      capture_type
    } = req.body;

    if (!latitude || !longitude)
      return res.status(400).json({ success: false, message: 'Coordinates required' });

    await db.execute(
      `INSERT INTO location_logs
         (user_id, latitude, longitude, address, house_no, street, city, state, pincode, capture_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        latitude, longitude,
        address  || null,
        house_no || null,
        street   || null,
        city     || null,
        state    || null,
        pincode  || null,
        capture_type || 'manual'
      ]
    );
    res.json({ success: true, message: 'Location saved' });
  } catch (e) {
    console.error('locationController.save:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/location/me  — own latest location
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM location_logs WHERE user_id = ?
       ORDER BY captured_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ success: true, location: rows[0] || null });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/location/all  — admin: all employees (filter by date / user)
exports.getAll = async (req, res) => {
  try {
    const { date, user_id } = req.query;

    let q = `
      SELECT l.id, l.user_id, u.name AS employee_name, u.email,
             l.latitude, l.longitude, l.address, l.house_no,
             l.street, l.city, l.state, l.pincode,
             l.capture_type, l.captured_at
      FROM location_logs l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      q += ' AND DATE(l.captured_at) = ?';
      params.push(date);
    }
    if (user_id) {
      q += ' AND l.user_id = ?';
      params.push(user_id);
    }
    q += ' ORDER BY l.captured_at DESC LIMIT 1000';

    const [rows] = await db.execute(q, params);
    res.json({ success: true, logs: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/location/employees  — list of employees with their latest location (for admin overview)
exports.getLatestPerEmployee = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id AS user_id, u.name, u.email,
             l.latitude, l.longitude, l.address, l.city, l.state,
             l.capture_type, l.captured_at
      FROM users u
      LEFT JOIN location_logs l ON l.id = (
        SELECT id FROM location_logs WHERE user_id = u.id ORDER BY captured_at DESC LIMIT 1
      )
      WHERE u.role = 'employee' AND u.is_active = 1
      ORDER BY u.name ASC
    `);
    res.json({ success: true, employees: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
