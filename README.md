# Layanan Aduan Masyarakat (MySQL Edition)

Aplikasi sistem pengaduan masyarakat yang kini telah terintegrasi dengan database MySQL menggunakan Node.js sebagai backend.

## Persyaratan Sistem
1.  **XAMPP / WAMP / Laragon** (untuk menjalankan MySQL & phpMyAdmin).
2.  **Node.js** terinstal di komputer Anda.

## Langkah-langkah Instalasi & Setup

### 1. Setup Database (phpMyAdmin)
1.  Buka panel kontrol XAMPP dan pastikan modul **MySQL** sudah dalam status **Running**.
2.  Buka browser dan akses `http://localhost/phpmyadmin`.
3.  Buat database baru dengan nama `layanan_aduan`.
4.  Klik database tersebut, lalu pilih tab **SQL**.
5.  Buka file `database.sql` yang ada di folder project ini, salin isinya, dan tempelkan ke dalam kotak SQL di phpMyAdmin.
6.  Klik tombol **Go**. Tabel `users` dan `reports` akan dibuat secara otomatis.

### 2. Konfigurasi Backend
1.  Buka file `.env` di folder project.
2.  Pastikan kredensial database sudah sesuai dengan settingan MySQL Anda:
    - `DB_USER=root` (default XAMPP)
    - `DB_PASSWORD=` (kosongkan jika default XAMPP)
    - `DB_NAME=layanan_aduan`

### 3. Menginstal Dependensi
Buka terminal (CMD/PowerShell) di folder project ini, lalu jalankan perintah:
```bash
npm install
```

### 4. Menjalankan Aplikasi
Setiap kali Anda ingin menjalankan aplikasi, Anda harus mengikuti urutan ini:

1.  **Jalankan Backend:**
    Di terminal, ketik perintah berikut:
    ```bash
    node server.js
    ```
    Pastikan muncul pesan `Server running on port 3000`. **Jangan tutup terminal ini selama aplikasi digunakan.**

2.  **Buka Frontend:**
    Buka file `index.html` menggunakan browser (sangat disarankan menggunakan fitur **Live Server** di VS Code atau cukup buka file tersebut langsung).

## Fitur Utama
- **Login & Register:** Data tersimpan aman di tabel `users` MySQL.
- **Buat Laporan:** Aduan masyarakat masuk ke tabel `reports`.
- **Dashboard Admin:** Melihat statistik langsung dari database.
- **Manajemen User:** Mengubah role user melalui API.

## Akun Admin Default
- **Email:** `admin@layanan.com`
- **Password:** `abubakarrifcky` (seperti yang tertera di file `asset/password`)
