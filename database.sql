-- Schema SQL for Layanan Aduan
-- Gunakan ini sebagai referensi untuk membangun database di MySQL, PostgreSQL, atau Supabase.

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')),
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_comments (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sample data untuk testing:
INSERT INTO users (name, email, password, role, joined_at)
VALUES
  ('Admin', 'admin@layanan.com', 'admin123', 'admin', '2026-04-01'),
  ('User Test', 'user@layanan.com', 'user123', 'user', '2026-04-08');

INSERT INTO reports (user_id, title, category, status, description, created_at)
VALUES
  (2, 'Perbaikan Jalan Rusak', 'Infrastruktur', 'completed', 'Jalan rusak di depan kantor desa perlu segera diperbaiki.', '2026-04-12'),
  (2, 'Lampu Jalan Mati', 'Pemeliharaan', 'processing', 'Lampu jalan di Jl. Melati mati sejak kemarin malam.', '2026-04-10'),
  (2, 'Masalah Pelayanan Publik', 'Pelayanan', 'pending', 'Petugas belum merespon aduan layanan publik yang diajukan.', '2026-04-08');
