const DB_KEY = 'aduanAppDb';
const SESSION_KEY = 'aduanAppUser';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function defaultDatabase() {
  return {
    users: [
      {
        id: 1,
        name: 'Admin',
        email: 'admin@layanan.com',
        password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        role: 'admin',
        joinedAt: '2026-04-01'
      },
      {
        id: 2,
        name: 'User Test',
        email: 'user@layanan.com',
        password: 'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446',
        role: 'user',
        joinedAt: '2026-04-08'
      }
    ],
    reports: [
      {
        id: 1,
        userEmail: 'user@layanan.com',
        title: 'Perbaikan Jalan Rusak',
        category: 'Infrastruktur',
        status: 'completed',
        createdAt: '2026-04-12',
        description: 'Jalan rusak di depan kantor desa perlu segera diperbaiki.'
      },
      {
        id: 2,
        userEmail: 'user@layanan.com',
        title: 'Lampu Jalan Mati',
        category: 'Pemeliharaan',
        status: 'processing',
        createdAt: '2026-04-10',
        description: 'Lampu jalan di Jl. Melati mati sejak kemarin malam.'
      },
      {
        id: 3,
        userEmail: 'user@layanan.com',
        title: 'Masalah Pelayanan Publik',
        category: 'Pelayanan',
        status: 'pending',
        createdAt: '2026-04-08',
        description: 'Petugas belum merespon aduan layanan publik yang diajukan.'
      }
    ]
  };
}

function loadDatabase() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveDatabase(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function initDatabase() {
  let db = loadDatabase();
  if (!db) {
    db = defaultDatabase();
    saveDatabase(db);
  } else {
    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.reports)) db.reports = [];
    if (!db.users.some(u => u.email === 'admin@layanan.com')) {
      db.users.unshift({
        id: Date.now(),
        name: 'Admin',
        email: 'admin@layanan.com',
        password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        role: 'admin',
        joinedAt: '2026-04-01'
      });
    }
    saveDatabase(db);
  }
  return db;
}

function getUserByEmail(email) {
  const db = initDatabase();
  return db.users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

function addUser(user) {
  const db = initDatabase();
  user.id = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  db.users.push(user);
  saveDatabase(db);
}

function getReportsByUserEmail(email) {
  const db = initDatabase();
  return db.reports.filter(report => report.userEmail.toLowerCase() === email.toLowerCase());
}

function getAllReports() {
  return initDatabase().reports;
}

function countReports(status) {
  const reports = getAllReports();
  return status ? reports.filter(report => report.status === status).length : reports.length;
}

function countUsers() {
  return initDatabase().users.length;
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireRole(role) {
  const user = getSession();
  if (!user || user.role !== role) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function handleLogin(event) {
  event.preventDefault();
  initDatabase();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    showMessage('Semua field harus diisi', 'error');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage('Format email tidak valid', 'error');
    return;
  }

  const db = initDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  let passwordMatch = false;
  if (user && user.password.length === 64) {
    passwordMatch = user.password === await hashPassword(password);
  } else if (user) {
    // Legacy plain text password — migrate to hash on successful login
    passwordMatch = user.password === password;
    if (passwordMatch) {
      user.password = await hashPassword(password);
      saveDatabase(db);
    }
  }

  if (!user || !passwordMatch) {
    showMessage('Email atau password salah', 'error');
    return;
  }

  saveSession({ email: user.email, name: user.name, role: user.role, joinedAt: user.joinedAt });
  showMessage('Login berhasil! Mengarahkan...', 'success');

  setTimeout(() => {
    if (user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'user-dashboard.html';
    }
  }, 1200);
}

async function handleRegister(event) {
  event.preventDefault();
  initDatabase();

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const terms = document.getElementById('terms').checked;

  if (!fullName || !email || !password || !confirmPassword) {
    showMessage('Semua field harus diisi', 'error');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage('Format email tidak valid', 'error');
    return;
  }

  if (password.length < 8) {
    showMessage('Password minimal 8 karakter', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showMessage('Password dan konfirmasi password tidak sesuai', 'error');
    return;
  }

  if (!terms) {
    showMessage('Anda harus menyetujui syarat & ketentuan', 'error');
    return;
  }

  if (getUserByEmail(email)) {
    showMessage('Email sudah terdaftar. Silakan masuk.', 'error');
    return;
  }

  const hashedPassword = await hashPassword(password);

  addUser({
    name: fullName,
    email,
    password: hashedPassword,
    role: 'user',
    joinedAt: new Date().toISOString().slice(0, 10)
  });

  showMessage('Pendaftaran berhasil! Mengarahkan ke login...', 'success');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1500);
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.textContent = text;
  messageDiv.className = `message show ${type}`;
  if (type === 'error') {
    setTimeout(() => {
      messageDiv.classList.remove('show');
    }, 4000);
  }
}

function logout() {
  if (confirm('Apakah Anda ingin keluar?')) {
    clearSession();
    window.location.href = 'index.html';
  }
}

function renderAdminDashboard() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('admin-dashboard.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  const totalReportsElem = document.getElementById('totalReports');
  const pendingReportsElem = document.getElementById('pendingReports');
  const completedReportsElem = document.getElementById('completedReports');
  const totalUsersElem = document.getElementById('totalUsers');

  if (totalReportsElem) totalReportsElem.textContent = countReports();
  if (pendingReportsElem) pendingReportsElem.textContent = countReports('pending');
  if (completedReportsElem) completedReportsElem.textContent = countReports('completed');
  if (totalUsersElem) totalUsersElem.textContent = countUsers();

  const reportTableBody = document.getElementById('reportTableBody');
  if (reportTableBody) {
    const reports = getAllReports().slice(0, 5); // Show only recent 5 on dashboard
    renderReportTable(reportTableBody, reports);
  }
}

function renderReportsPage() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('kelola_laporan.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  const totalReportsElem = document.getElementById('totalReports');
  const pendingReportsElem = document.getElementById('pendingReports');
  const completedReportsElem = document.getElementById('completedReports');

  if (totalReportsElem) totalReportsElem.textContent = countReports();
  if (pendingReportsElem) pendingReportsElem.textContent = countReports('pending');
  if (completedReportsElem) completedReportsElem.textContent = countReports('completed');

  const reportTableBody = document.getElementById('reportTableBody');
  if (reportTableBody) {
    const reports = getAllReports();
    renderReportTable(reportTableBody, reports);
  }
}

function renderReportTable(container, reports) {
  if (!reports.length) {
    container.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada laporan.</td></tr>';
    return;
  }

  container.innerHTML = reports.map(report => {
    const badgeClass = getStatusBadgeClass(report.status);
    const statusLabel = getStatusLabel(report.status);
    const reporterName = report.name || report.userEmail;
    const satker = report.satker || report.category || '-';
    const location = report.location || '-';
    return `
      <tr>
        <td>#ADU${report.id.toString().padStart(3, '0')}</td>
        <td>${reporterName}</td>
        <td>${satker}</td>
        <td>${location}</td>
        <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
        <td>${formatShortDate(report.createdAt)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-view" onclick="viewReport(${report.id})">Lihat</button>
            <button class="btn-small btn-edit" onclick="editReport(${report.id})">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderManageUsers() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('manage-users.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  const db = initDatabase();
  const userTableBody = document.getElementById('userTableBody');
  if (userTableBody) {
    userTableBody.innerHTML = db.users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="status-badge ${u.role === 'admin' ? 'status-admin_confirmed' : 'status-user_confirmed'}">${u.role}</span></td>
        <td>${formatDate(u.joinedAt)}</td>
        <td>
          <button class="btn-small btn-edit" onclick="toggleUserRole(${u.id})">Tukar Role</button>
        </td>
      </tr>
    `).join('');
  }
}

function toggleUserRole(userId) {
  const db = initDatabase();
  const user = db.users.find(u => u.id === userId);
  if (!user) return;
  
  if (user.email === 'admin@layanan.com') {
    alert('Role admin utama tidak dapat diubah.');
    return;
  }

  user.role = user.role === 'admin' ? 'user' : 'admin';
  saveDatabase(db);
  renderManageUsers();
}

function renderAnalytics() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('analytics.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  const reports = getAllReports();
  const categories = {};
  reports.forEach(r => {
    const cat = r.satker || r.category || 'Umum';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const analyticsContent = document.getElementById('analyticsContent');
  if (analyticsContent) {
    analyticsContent.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Laporan</div>
          <div class="stat-value">${reports.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">User Terdaftar</div>
          <div class="stat-value">${countUsers()}</div>
        </div>
      </div>
      <div class="content-section" style="margin-top: 20px;">
        <h3>Sebaran Kategori Aduan</h3>
        <ul style="list-style: none; padding: 0;">
          ${Object.entries(categories).map(([cat, count]) => `
            <li style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
              <span>${cat}</span>
              <div style="flex-grow: 1; margin: 0 15px; background: #eee; height: 10px; border-radius: 5px; overflow: hidden;">
                <div style="background: #2196F3; width: ${(count / reports.length) * 100}%; height: 100%;"></div>
              </div>
              <span>${count}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
}

function renderSettings() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('settings.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';
}

function updateAdminSidebar(activePage) {
  const sidebarLinks = document.querySelectorAll('.menu-link');
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === activePage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function renderUserDashboard() {
  const user = requireRole('user');
  if (!user) return;

  document.getElementById('userName').textContent = user.name || 'User';
  document.getElementById('userEmail').textContent = user.email || 'user@example.com';
  document.getElementById('joinDate').textContent = formatDate(user.joinedAt || new Date().toISOString());

  const reports = getReportsByUserEmail(user.email);
  const total = reports.length;
  const pending = reports.filter(r => r.status === 'pending').length;
  const userConfirmed = reports.filter(r => r.status === 'user_confirmed').length;
  const adminConfirmed = reports.filter(r => r.status === 'admin_confirmed').length;
  const completed = reports.filter(r => r.status === 'completed').length;

  const totalElem = document.getElementById('userTotalReports');
  const pendingElem = document.getElementById('userPendingReports');
  const completedElem = document.getElementById('userCompletedReports');
  if (totalElem) totalElem.textContent = total;
  if (pendingElem) pendingElem.textContent = pending;
  if (completedElem) completedElem.textContent = completed;

  const reportList = document.getElementById('reportList');
  if (reportList) {
    reportList.innerHTML = reports.length ? reports.map(report => {
      const badgeClass = getStatusBadgeClass(report.status);
      const statusLabel = getStatusLabel(report.status)
      const targetSatker = report.satker || report.category || 'Umum';
      return `
        <div class="report-item">
          <div class="report-item-info">
            <div class="report-title">${report.title}</div>
            <div class="report-meta">
              <span>${targetSatker}</span>
              <span>${formatShortDate(report.createdAt)}</span>
            </div>
          </div>
          <span class="status-badge ${badgeClass}">${statusLabel}</span>
          <button class="btn-view" onclick="viewReport(${report.id})">Lihat</button>
        </div>
      `;
    }).join('') : '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Belum ada laporan. Klik tombol Buat Laporan untuk menambahkan laporan baru.</div></div>';
  }
}

function createReport() {
  const user = getSession();
  if (!user || user.role !== 'user') {
    window.location.href = 'login.html';
    return;
  }
  window.location.href = 'create-report.html';
}

function handleCreateReport(event) {
  event.preventDefault();
  const user = requireRole('user');
  if (!user) return;

  const name = document.getElementById('reportName').value.trim();
  const whatsapp = document.getElementById('reportWhatsapp').value.trim();
  const satker = document.getElementById('reportSatker').value;
  const lokasi = document.getElementById('reportLocation').value.trim();
  const description = document.getElementById('reportDescription').value.trim();

  if (!name || !whatsapp || !satker || !lokasi || !description) {
    showMessage('Semua field harus diisi', 'error');
    return;
  }

  const db = initDatabase();
  const nextId = db.reports.length ? Math.max(...db.reports.map(r => r.id)) + 1 : 1;
  const title = description.split('\n')[0].slice(0, 60) || `Aduan ${satker}`;

  db.reports.push({
    id: nextId,
    userEmail: user.email,
    title,
    name,
    whatsapp,
    satker,
    location: lokasi,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10),
    description
  });
  saveDatabase(db);

  showMessage('Laporan berhasil dikirim. Mengalihkan ke dashboard...', 'success');
  setTimeout(() => {
    window.location.href = 'user-dashboard.html';
  }, 1400);
}

function viewReport(id) {
  window.location.href = `report-detail.html?id=${id}`;
}

function editReport(id) {
  const user = getSession();
  if (!user || user.role !== 'admin') {
    alert('Hanya admin yang dapat mengedit status laporan.');
    return;
  }

  const db = initDatabase();
  const report = db.reports.find(r => r.id === id);
  if (!report) {
    alert('Laporan tidak ditemukan.');
    return;
  }

  const currentStatus = report.status;
  const statusOptions = ['pending', 'user_confirmed', 'admin_confirmed', 'completed'];
  const statusLabels = ['Menunggu Konfirmasi', 'Dikonfirmasi User', 'Dikonfirmasi Admin', 'Selesai'];

  let statusText = 'Pilih status baru:\n';
  statusOptions.forEach((status, index) => {
    statusText += `${index + 1}. ${statusLabels[index]} (${status})\n`;
  });
  statusText += '\nMasukkan nomor (1-4):';

  const choice = prompt(statusText, statusOptions.indexOf(currentStatus) + 1);
  if (!choice) return;

  const choiceIndex = parseInt(choice) - 1;
  if (choiceIndex < 0 || choiceIndex >= statusOptions.length) {
    alert('Pilihan tidak valid.');
    return;
  }

  const newStatus = statusOptions[choiceIndex];
  report.status = newStatus;
  saveDatabase(db);
  alert('Status laporan berhasil diperbarui.');
  renderAdminDashboard();
}

function formatShortDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toISOString().slice(0, 10);
}

function renderReportDetail(reportId) {
  const user = getSession();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const report = getAllReports().find(r => r.id === reportId);
  if (!report) {
    showMessage('Laporan tidak ditemukan', 'error');
    return;
  }

  // Set back link based on user role
  const backLink = document.getElementById('backLink');
  if (backLink) {
    backLink.href = user.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
  }

  const reportDetail = document.getElementById('reportDetail');
  if (!reportDetail) return;

  const statusBadgeClass = getStatusBadgeClass(report.status);
  const statusLabel = getStatusLabel(report.status);
  const isUserReport = report.userEmail === user.email;
  const canConfirm = (user.role === 'user' && isUserReport && report.status === 'pending') ||
                     (user.role === 'admin' && report.status === 'user_confirmed');

  const userConfirmed = ['user_confirmed', 'admin_confirmed', 'completed'].includes(report.status);
  const adminConfirmed = ['admin_confirmed', 'completed'].includes(report.status);

  reportDetail.innerHTML = `
    <div class="report-header">
      <div>
        <h1 class="report-title">${report.title}</h1>
        <p class="report-id">#ADU${report.id.toString().padStart(3, '0')}</p>
      </div>
      <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
    </div>

    <div class="report-meta">
      <div class="meta-item">
        <div class="meta-label">Nama Pelapor</div>
        <div class="meta-value">${report.name || 'N/A'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Email</div>
        <div class="meta-value">${report.userEmail}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">No. WhatsApp</div>
        <div class="meta-value">${report.whatsapp || 'N/A'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Satker Tujuan</div>
        <div class="meta-value">${report.satker || report.category || 'Umum'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Lokasi Kejadian</div>
        <div class="meta-value">${report.location || 'N/A'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Tanggal Dibuat</div>
        <div class="meta-value">${formatDate(report.createdAt)}</div>
      </div>
    </div>

    <div class="report-description">
      <div class="description-label">Deskripsi Aduan</div>
      <p class="description-text">${report.description}</p>
    </div>

    <div class="confirmation-section">
      <h3 class="confirmation-title">Status Konfirmasi</h3>
      <div class="confirmation-status">
        <div class="confirmation-item">
          <div class="confirmation-icon ${userConfirmed ? 'confirmed' : 'pending'}">
            ${userConfirmed ? '✓' : '○'}
          </div>
          <div class="confirmation-text">Konfirmasi User</div>
        </div>
        <div class="confirmation-item">
          <div class="confirmation-icon ${adminConfirmed ? 'confirmed' : 'pending'}">
            ${adminConfirmed ? '✓' : '○'}
          </div>
          <div class="confirmation-text">Konfirmasi Admin</div>
        </div>
      </div>

      <div class="action-buttons">
        ${canConfirm ? `<button class="btn btn-success" onclick="confirmReport(${report.id})">Konfirmasi Laporan</button>` : ''}
        ${user.role === 'admin' ? `<button class="btn btn-primary" onclick="editReport(${report.id})">Ubah Status</button>` : ''}
        <button class="btn btn-secondary" onclick="window.history.back()">Kembali</button>
      </div>
    </div>
  `;
}

function getStatusBadgeClass(status) {
  const classes = {
    'pending': 'status-pending',
    'user_confirmed': 'status-user_confirmed',
    'admin_confirmed': 'status-admin_confirmed',
    'completed': 'status-completed'
  };
  return classes[status] || 'status-pending';
}

function getStatusLabel(status) {
  const labels = {
    'pending': 'Menunggu Konfirmasi',
    'user_confirmed': 'Dikonfirmasi User',
    'admin_confirmed': 'Dikonfirmasi Admin',
    'completed': 'Selesai'
  };
  return labels[status] || 'Unknown';
}

function confirmReport(reportId) {
  const user = getSession();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const db = initDatabase();
  const report = db.reports.find(r => r.id === reportId);
  if (!report) {
    showMessage('Laporan tidak ditemukan', 'error');
    return;
  }

  let newStatus;
  if (user.role === 'user' && report.status === 'pending') {
    newStatus = 'user_confirmed';
  } else if (user.role === 'admin' && report.status === 'user_confirmed') {
    newStatus = 'admin_confirmed';
  } else {
    showMessage('Tidak dapat mengkonfirmasi laporan ini', 'error');
    return;
  }

  report.status = newStatus;
  saveDatabase(db);

  showMessage('Laporan berhasil dikonfirmasi!', 'success');
  setTimeout(() => {
    renderReportDetail(reportId);
  }, 1500);
}
