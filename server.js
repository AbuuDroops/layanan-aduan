require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes

// User Login
app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  // Note: In a real app, use bcrypt to compare passwords. 
  // Here we assume the frontend sends a hash or we check simple equality for now.
  if (user.password !== password) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  res.json({
    email: user.email,
    name: user.name,
    role: user.role,
    joinedAt: user.joinedAt
  });
}));

// User Register
app.post('/api/register', asyncHandler(async (req, res) => {
  const { name, email, password, role, joinedAt } = req.body;
  
  try {
    await pool.execute(
      'INSERT INTO users (name, email, password, role, joinedAt) VALUES (?, ?, ?, ?, ?)',
      [name, email, password, role || 'user', joinedAt]
    );
    res.status(201).json({ message: 'Registrasi berhasil' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email sudah terdaftar' });
    } else {
      throw error;
    }
  }
}));

// Get Reports
app.get('/api/reports', asyncHandler(async (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM reports';
  let params = [];

  if (email) {
    query += ' WHERE userEmail = ?';
    params.push(email);
  }

  const [rows] = await pool.execute(query, params);
  res.json(rows);
}));

// Create Report
app.post('/api/reports', asyncHandler(async (req, res) => {
  const { userEmail, title, name, whatsapp, satker, location, status, createdAt, description } = req.body;
  
  const [result] = await pool.execute(
    'INSERT INTO reports (userEmail, title, name, whatsapp, satker, location, status, createdAt, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userEmail, title, name, whatsapp, satker, location, status || 'pending', createdAt, description]
  );
  
  res.status(201).json({ id: result.insertId, message: 'Laporan berhasil dibuat' });
}));

// Update Report Status
app.patch('/api/reports/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  await pool.execute('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
  res.json({ message: 'Status laporan diperbarui' });
}));

// Analytics
app.get('/api/stats', asyncHandler(async (req, res) => {
  const [totalReports] = await pool.execute('SELECT COUNT(*) as count FROM reports');
  const [pendingReports] = await pool.execute('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');
  const [completedReports] = await pool.execute('SELECT COUNT(*) as count FROM reports WHERE status = "completed"');
  const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');

  res.json({
    totalReports: totalReports[0].count,
    pendingReports: pendingReports[0].count,
    completedReports: completedReports[0].count,
    totalUsers: totalUsers[0].count
  });
}));

// Manage Users
app.get('/api/users', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email, role, joinedAt FROM users');
  res.json(rows);
}));

app.patch('/api/users/:id/role', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute('SELECT email, role FROM users WHERE id = ?', [id]);
  const user = rows[0];

  if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
  if (user.email === 'admin@layanan.com') return res.status(400).json({ message: 'Role admin utama tidak dapat diubah' });

  const newRole = user.role === 'admin' ? 'user' : 'admin';
  await pool.execute('UPDATE users SET role = ? WHERE id = ?', [newRole, id]);
  res.json({ message: `Role berhasil diubah menjadi ${newRole}` });
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
