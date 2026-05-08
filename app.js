const API_URL = 'http://localhost:3000/api';
const SESSION_KEY = 'aduanAppUser';

/**
 * Menghasilkan hash SHA-256 dari string password untuk keamanan data di database.
 * @param {string} password - Teks password yang akan di-hash.
 * @returns {Promise<string>} - Hasil hash dalam format heksadesimal.
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mengambil data session user yang tersimpan di localStorage setelah login.
 * @returns {Object|null} - Objek user atau null jika belum login.
 */
function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

/**
 * Menyimpan data session user ke localStorage setelah berhasil login.
 * @param {Object} user - Objek informasi user.
 */
function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/**
 * Menghapus data session dari localStorage saat user melakukan logout.
 */
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Memastikan user memiliki hak akses (role) yang sesuai untuk mengakses halaman tertentu.
 * @param {string} role - Role yang diwajibkan ('admin' atau 'user').
 * @returns {Object|null} - Objek user jika valid, atau redirect ke login jika tidak valid.
 */
function requireRole(role) {
  const user = getSession();
  if (!user || user.role !== role) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/**
 * Memformat string tanggal ISO menjadi format panjang lokal Indonesia (misal: 12 April 2026).
 * @param {string} dateString - String tanggal asal.
 * @returns {string} - Tanggal terformat.
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Memformat string tanggal menjadi format pendek YYYY-MM-DD.
 * @param {string} dateString - String tanggal asal.
 * @returns {string} - Tanggal terformat pendek.
 */
function formatShortDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toISOString().slice(0, 10);
}

/**
 * Menampilkan pesan notifikasi (sukses/error) pada elemen dengan ID 'message'.
 * @param {string} text - Isi pesan yang ingin ditampilkan.
 * @param {string} type - Tipe pesan ('success' atau 'error').
 */
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

/**
 * Menangani proses login user dengan mengirimkan email dan password yang telah di-hash ke API.
 * @param {Event} event - Event submit dari form login.
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    showMessage('Semua field harus diisi', 'error');
    return;
  }

  const hashedPassword = await hashPassword(password);

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: hashedPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || 'Login gagal', 'error');
      return;
    }

    saveSession(data);
    showMessage('Login berhasil! Mengarahkan...', 'success');

    setTimeout(() => {
      window.location.href = data.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    }, 1200);
  } catch (error) {
    showMessage('Gagal menghubungkan ke server backend', 'error');
  }
}

/**
 * Menangani proses pendaftaran user baru melalui API MySQL.
 * @param {Event} event - Event submit dari form registrasi.
 */
async function handleRegister(event) {
  event.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const terms = document.getElementById('terms').checked;

  if (!fullName || !email || !password || !confirmPassword) {
    showMessage('Semua field harus diisi', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showMessage('Password dan Konfirmasi Password tidak sesuai', 'error');
    return;
  }

  if (!terms) {
    showMessage('Anda harus menyetujui syarat & ketentuan', 'error');
    return;
  }

  const hashedPassword = await hashPassword(password);

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fullName,
        email,
        password: hashedPassword,
        role: 'user',
        joinedAt: new Date().toISOString().slice(0, 10)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || 'Registrasi gagal', 'error');
      return;
    }

    showMessage('Pendaftaran berhasil! Silakan login.', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (error) {
    showMessage('Gagal menghubungkan ke server backend', 'error');
  }
}

/**
 * Menangani pembuatan laporan baru oleh user dan menyimpannya ke MySQL melalui API.
 * @param {Event} event - Event submit dari form buat laporan.
 */
async function handleCreateReport(event) {
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

  const title = description.split('\n')[0].slice(0, 60) || `Aduan ${satker}`;

  try {
    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: user.email,
        title,
        name,
        whatsapp,
        satker,
        location: lokasi,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
        description
      })
    });

    if (!response.ok) {
      showMessage('Gagal mengirim laporan ke database', 'error');
      return;
    }

    showMessage('Laporan berhasil dikirim!', 'success');
    setTimeout(() => {
      window.location.href = 'user-dashboard.html';
    }, 1400);
  } catch (error) {
    showMessage('Gagal menghubungkan ke server backend', 'error');
  }
}

/**
 * Mengambil data statistik dan laporan terbaru untuk ditampilkan di dashboard admin.
 */
async function renderAdminDashboard() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('admin-dashboard.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  try {
    const [statsRes, reportsRes] = await Promise.all([
      fetch(`${API_URL}/stats`),
      fetch(`${API_URL}/reports`)
    ]);

    const stats = await statsRes.json();
    const reports = await reportsRes.json();

    if (document.getElementById('totalReports')) document.getElementById('totalReports').textContent = stats.totalReports;
    if (document.getElementById('pendingReports')) document.getElementById('pendingReports').textContent = stats.pendingReports;
    if (document.getElementById('completedReports')) document.getElementById('completedReports').textContent = stats.completedReports;
    if (document.getElementById('totalUsers')) document.getElementById('totalUsers').textContent = stats.totalUsers;

    const reportTableBody = document.getElementById('reportTableBody');
    if (reportTableBody) {
      renderReportTable(reportTableBody, reports.slice(0, 5));
    }
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

/**
 * Menampilkan semua daftar laporan yang masuk ke dashboard admin.
 */
async function renderReportsPage() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('kelola_laporan.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  try {
    const [statsRes, reportsRes] = await Promise.all([
      fetch(`${API_URL}/stats`),
      fetch(`${API_URL}/reports`)
    ]);

    const stats = await statsRes.json();
    const reports = await reportsRes.json();

    if (document.getElementById('totalReports')) document.getElementById('totalReports').textContent = stats.totalReports;
    if (document.getElementById('pendingReports')) document.getElementById('pendingReports').textContent = stats.pendingReports;
    if (document.getElementById('completedReports')) document.getElementById('completedReports').textContent = stats.completedReports;

    const reportTableBody = document.getElementById('reportTableBody');
    if (reportTableBody) {
      renderReportTable(reportTableBody, reports);
    }
  } catch (error) {
    console.error('Error loading reports page:', error);
  }
}

/**
 * Fungsi pembantu untuk merender baris-baris tabel laporan.
 * @param {HTMLElement} container - Elemen tbody tempat data akan dirender.
 * @param {Array} reports - Data laporan dari database.
 */
function renderReportTable(container, reports) {
  if (!reports.length) {
    container.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada laporan.</td></tr>';
    return;
  }

  container.innerHTML = reports.map(report => {
    const badgeClass = getStatusBadgeClass(report.status);
    const statusLabel = getStatusLabel(report.status);
    const reporterName = report.name || report.userEmail;
    return `
      <tr>
        <td>#ADU${report.id.toString().padStart(3, '0')}</td>
        <td>${reporterName}</td>
        <td>${report.satker || '-'}</td>
        <td>${report.location || '-'}</td>
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

/**
 * Mengambil dan menampilkan data laporan khusus milik user yang sedang login.
 */
async function renderUserDashboard() {
  const user = requireRole('user');
  if (!user) return;

  document.getElementById('userName').textContent = user.name || 'User';
  document.getElementById('userEmail').textContent = user.email || 'user@example.com';
  document.getElementById('joinDate').textContent = formatDate(user.joinedAt);

  try {
    const response = await fetch(`${API_URL}/reports?email=${user.email}`);
    const reports = await response.json();

    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const completed = reports.filter(r => r.status === 'completed').length;

    if (document.getElementById('userTotalReports')) document.getElementById('userTotalReports').textContent = total;
    if (document.getElementById('userPendingReports')) document.getElementById('userPendingReports').textContent = pending;
    if (document.getElementById('userCompletedReports')) document.getElementById('userCompletedReports').textContent = completed;

    const reportList = document.getElementById('reportList');
    if (reportList) {
      reportList.innerHTML = reports.length ? reports.map(report => {
        const badgeClass = getStatusBadgeClass(report.status);
        const statusLabel = getStatusLabel(report.status);
        return `
          <div class="report-item">
            <div class="report-item-info">
              <div class="report-title">${report.title}</div>
              <div class="report-meta">
                <span>${report.satker || 'Umum'}</span>
                <span>${formatShortDate(report.createdAt)}</span>
              </div>
            </div>
            <span class="status-badge ${badgeClass}">${statusLabel}</span>
            <button class="btn-view" onclick="viewReport(${report.id})">Lihat</button>
          </div>
        `;
      }).join('') : '<div class="empty-state"><div class="empty-state-text">Belum ada laporan.</div></div>';
    }
  } catch (error) {
    console.error('Error loading user dashboard:', error);
  }
}

/**
 * Mengambil detail laporan tunggal dari API dan merendernya ke halaman detail.
 * @param {number} reportId - ID laporan yang ingin dilihat.
 */
async function renderReportDetail(reportId) {
  const user = getSession();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/reports`);
    const reports = await response.json();
    const report = reports.find(r => r.id == reportId);

    if (!report) {
      showMessage('Laporan tidak ditemukan', 'error');
      return;
    }

    const backLink = document.getElementById('backLink');
    if (backLink) backLink.href = user.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';

    const reportDetail = document.getElementById('reportDetail');
    if (!reportDetail) return;

    const statusBadgeClass = getStatusBadgeClass(report.status);
    const statusLabel = getStatusLabel(report.status);
    const isUserReport = report.userEmail === user.email;
    const canConfirm = (user.role === 'user' && isUserReport && report.status === 'pending') ||
                       (user.role === 'admin' && report.status === 'user_confirmed');

    reportDetail.innerHTML = `
      <div class="report-header">
        <div>
          <h1 class="report-title">${report.title}</h1>
          <p class="report-id">#ADU${report.id.toString().padStart(3, '0')}</p>
        </div>
        <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
      </div>

      <div class="report-meta">
        <div class="meta-item"><div class="meta-label">Nama Pelapor</div><div class="meta-value">${report.name || 'N/A'}</div></div>
        <div class="meta-item"><div class="meta-label">Email</div><div class="meta-value">${report.userEmail}</div></div>
        <div class="meta-item"><div class="meta-label">No. WhatsApp</div><div class="meta-value">${report.whatsapp || 'N/A'}</div></div>
        <div class="meta-item"><div class="meta-label">Satker</div><div class="meta-value">${report.satker || 'Umum'}</div></div>
        <div class="meta-item"><div class="meta-label">Lokasi</div><div class="meta-value">${report.location || 'N/A'}</div></div>
        <div class="meta-item"><div class="meta-label">Tanggal</div><div class="meta-value">${formatDate(report.createdAt)}</div></div>
      </div>

      <div class="report-description">
        <div class="description-label">Deskripsi</div>
        <p class="description-text">${report.description}</p>
      </div>

      <div class="confirmation-section">
        <div class="action-buttons">
          ${canConfirm ? `<button class="btn btn-success" onclick="confirmReport(${report.id})">Konfirmasi</button>` : ''}
          ${user.role === 'admin' ? `<button class="btn btn-primary" onclick="editReport(${report.id})">Ubah Status</button>` : ''}
          <button class="btn btn-secondary" onclick="window.history.back()">Kembali</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading report detail:', error);
  }
}

/**
 * Melakukan konfirmasi laporan melalui API PATCH.
 * @param {number} reportId - ID laporan yang akan dikonfirmasi.
 */
async function confirmReport(reportId) {
  const user = getSession();
  if (!user) return;

  try {
    const response = await fetch(`${API_URL}/reports`);
    const reports = await response.json();
    const report = reports.find(r => r.id == reportId);

    let newStatus;
    if (user.role === 'user' && report.status === 'pending') newStatus = 'user_confirmed';
    else if (user.role === 'admin' && report.status === 'user_confirmed') newStatus = 'admin_confirmed';
    else return;

    await fetch(`${API_URL}/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    showMessage('Laporan berhasil dikonfirmasi!', 'success');
    setTimeout(() => renderReportDetail(reportId), 1000);
  } catch (error) {
    console.error('Error confirming report:', error);
  }
}

/**
 * (Admin Only) Menampilkan prompt untuk mengubah status laporan secara manual.
 * @param {number} id - ID laporan yang akan diubah statusnya.
 */
async function editReport(id) {
  const user = getSession();
  if (!user || user.role !== 'admin') return;

  const statusOptions = ['pending', 'user_confirmed', 'admin_confirmed', 'completed'];
  const statusLabels = ['Menunggu', 'User Konf', 'Admin Konf', 'Selesai'];

  let text = 'Pilih status baru (1-4):\n' + statusLabels.map((l, i) => `${i + 1}. ${l}`).join('\n');
  const choice = prompt(text, '1');
  if (!choice) return;

  const newStatus = statusOptions[parseInt(choice) - 1];
  if (!newStatus) return;

  try {
    await fetch(`${API_URL}/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    alert('Status laporan berhasil diperbarui');
    location.reload();
  } catch (error) {
    console.error('Error editing report:', error);
  }
}

/**
 * (Admin Only) Mengambil semua daftar user dan merendernya ke tabel manajemen user.
 */
async function renderManageUsers() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('manage-users.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  try {
    const response = await fetch(`${API_URL}/users`);
    const users = await response.json();
    const userTableBody = document.getElementById('userTableBody');
    if (userTableBody) {
      userTableBody.innerHTML = users.map(u => `
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
  } catch (error) {
    console.error('Error loading users management:', error);
  }
}

/**
 * (Admin Only) Menampilkan visualisasi data analitik aduan berdasarkan kategori.
 */
async function renderAnalytics() {
  const user = requireRole('admin');
  if (!user) return;

  updateAdminSidebar('analytics.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';

  try {
    const [statsRes, reportsRes] = await Promise.all([
      fetch(`${API_URL}/stats`),
      fetch(`${API_URL}/reports`)
    ]);

    const stats = await statsRes.json();
    const reports = await reportsRes.json();

    const categories = {};
    reports.forEach(r => {
      const cat = r.satker || 'Umum';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const analyticsContent = document.getElementById('analyticsContent');
    if (analyticsContent) {
      analyticsContent.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Total Laporan</div><div class="stat-value">${stats.totalReports}</div></div>
          <div class="stat-card"><div class="stat-label">User Terdaftar</div><div class="stat-value">${stats.totalUsers}</div></div>
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
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

/**
 * Menampilkan halaman pengaturan admin.
 */
function renderSettings() {
  const user = requireRole('admin');
  if (!user) return;
  updateAdminSidebar('settings.html');
  document.getElementById('userName').textContent = user.name || 'Admin User';
}

/**
 * (Admin Only) Menukar role user antara 'user' dan 'admin' melalui API.
 * @param {number} userId - ID user yang akan ditukar rolenya.
 */
async function toggleUserRole(userId) {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/role`, { method: 'PATCH' });
    const data = await response.json();
    if (!response.ok) {
      alert(data.message);
      return;
    }
    renderManageUsers();
  } catch (error) {
    console.error('Error toggling user role:', error);
  }
}

/**
 * Melakukan logout dengan menghapus session dan mengarahkan ke halaman index.
 */
function logout() { 
  if (confirm('Apakah Anda yakin ingin keluar?')) { 
    clearSession(); 
    window.location.href = 'index.html'; 
  } 
}

/**
 * Mengarahkan ke halaman detail laporan.
 * @param {number} id - ID laporan.
 */
function viewReport(id) { window.location.href = `report-detail.html?id=${id}`; }

/**
 * Mengarahkan user ke halaman pembuatan laporan baru.
 */
function createReport() { window.location.href = 'create-report.html'; }

/**
 * Mendapatkan class CSS untuk badge status laporan.
 * @param {string} s - Status laporan.
 * @returns {string} - Class CSS.
 */
function getStatusBadgeClass(s) {
  const c = { 'pending': 'status-pending', 'user_confirmed': 'status-user_confirmed', 'admin_confirmed': 'status-admin_confirmed', 'completed': 'status-completed' };
  return c[s] || 'status-pending';
}

/**
 * Mendapatkan label teks bahasa Indonesia untuk status laporan.
 * @param {string} s - Status laporan.
 * @returns {string} - Label status.
 */
function getStatusLabel(s) {
  const l = { 'pending': 'Menunggu', 'user_confirmed': 'Konf User', 'admin_confirmed': 'Konf Admin', 'completed': 'Selesai' };
  return l[s] || 'Unknown';
}

/**
 * Memperbarui status 'active' pada menu sidebar admin.
 * @param {string} page - Nama file halaman yang aktif.
 */
function updateAdminSidebar(page) {
  document.querySelectorAll('.menu-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === page);
  });
}
