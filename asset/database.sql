CREATE DATABASE IF NOT EXISTS layanan_aduan;
USE layanan_aduan;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  joinedAt DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userEmail VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  whatsapp VARCHAR(20),
  satker VARCHAR(255),
  location VARCHAR(255),
  status ENUM('pending', 'user_confirmed', 'admin_confirmed', 'completed') DEFAULT 'pending',
  createdAt DATE NOT NULL,
  description TEXT,
  FOREIGN KEY (userEmail) REFERENCES users(email) ON DELETE CASCADE
);

-- Insert default admin
INSERT INTO users (name, email, password, role, joinedAt) 
VALUES ('Admin', 'admin@layanan.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', '2026-04-01')
ON DUPLICATE KEY UPDATE name=name;
