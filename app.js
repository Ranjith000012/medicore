const API = 'http://localhost:5000/api';

// ===== PARTICLES =====
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '0,245,255' : '123,47,255'
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,245,255,${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ===== TAB NAVIGATION =====
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.currentTarget.classList.add('active');

  if (name === 'dashboard') loadStats();
  if (name === 'patients') loadAllPatients();
  if (name === 'report') loadHospitalsDoctors();
}

// ===== TOAST =====
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ===== ANIMATED COUNTER =====
function animateCount(el, target) {
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ===== CHECK SERVER =====
async function checkServer() {
  try {
    const res = await fetch(`${API}/stats`);
    if (res.ok) {
      document.getElementById('serverStatus').textContent = 'SYSTEM ONLINE';
      document.querySelector('.status-dot').style.background = '#00ff88';
    }
  } catch {
    document.getElementById('serverStatus').textContent = 'SERVER OFFLINE';
    document.querySelector('.status-dot').style.background = '#ff2d78';
    document.querySelector('.status-dot').style.boxShadow = '0 0 10px #ff2d78';
  }
}

// ===== LOAD STATS =====
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const data = await res.json();
    animateCount(document.getElementById('stat-patients'), data.total_patients);
    animateCount(document.getElementById('stat-hospitals'), data.total_hospitals);
    animateCount(document.getElementById('stat-doctors'), data.total_doctors);
    animateCount(document.getElementById('stat-reports'), data.total_reports);
  } catch {
    toast('Cannot connect to backend server', 'error');
  }
}

// ===== QUICK SEARCH =====
async function quickSearch() {
  const phone = document.getElementById('quickPhone').value.trim();
  if (!phone) { toast('Enter a phone number', 'error'); return; }
  const container = document.getElementById('quickResult');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⟳</div><p>LOADING...</p></div>';
  try {
    const [pRes, rRes] = await Promise.all([
      fetch(`${API}/patient/${phone}`),
      fetch(`${API}/reports/${phone}`)
    ]);
    if (!pRes.ok) { container.innerHTML = notFoundHTML(); return; }
    const patient = await pRes.json();
    const reports = await rRes.json();
    container.innerHTML = buildProfileHTML(patient, reports);
  } catch {
    container.innerHTML = '<div class="empty-state"><p>CONNECTION ERROR</p></div>';
  }
}

// ===== REGISTER PATIENT =====
async function registerPatient() {
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  if (!name || !phone) { toast('Name and phone are required', 'error'); return; }

  const payload = {
    name, phone,
    age: document.getElementById('reg-age').value || null,
    gender: document.getElementById('reg-gender').value || null,
    blood_group: document.getElementById('reg-blood').value || null,
    address: document.getElementById('reg-address').value.trim() || null,
    allergies: document.getElementById('reg-allergies').value.trim() || null,
    emergency_contact: document.getElementById('reg-ec-name').value.trim() || null,
    emergency_phone: document.getElementById('reg-ec-phone').value.trim() || null
  };

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      toast('Patient registered successfully!', 'success');
      ['reg-name','reg-phone','reg-age','reg-address','reg-allergies','reg-ec-name','reg-ec-phone'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('reg-gender').value = '';
      document.getElementById('reg-blood').value = '';
    } else {
      toast(data.error || 'Registration failed', 'error');
    }
  } catch {
    toast('Cannot connect to server', 'error');
  }
}

// ===== LOAD PATIENT FOR REPORT =====
async function loadPatientForReport() {
  const phone = document.getElementById('rep-phone').value.trim();
  if (!phone) { toast('Enter phone number', 'error'); return; }
  try {
    const res = await fetch(`${API}/patient/${phone}`);
    const infoDiv = document.getElementById('rep-patient-info');
    if (!res.ok) {
      infoDiv.style.display = 'none';
      toast('Patient not found. Register first.', 'error');
      return;
    }
    const p = await res.json();
    infoDiv.style.display = 'flex';
    infoDiv.innerHTML = `
      <div class="mini-field"><div class="mini-label">NAME</div><div class="mini-value">${p.name}</div></div>
      <div class="mini-field"><div class="mini-label">AGE</div><div class="mini-value">${p.age || '—'}</div></div>
      <div class="mini-field"><div class="mini-label">GENDER</div><div class="mini-value">${p.gender || '—'}</div></div>
      <div class="mini-field"><div class="mini-label">BLOOD</div><div class="mini-value">${p.blood_group || '—'}</div></div>
      <div class="mini-field"><div class="mini-label">ALLERGIES</div><div class="mini-value" style="color:#ff2d78">${p.allergies || 'None'}</div></div>
    `;
    // Set today's date
    document.getElementById('rep-date').value = new Date().toISOString().split('T')[0];
    toast('Patient loaded', 'success');
  } catch {
    toast('Connection error', 'error');
  }
}

// ===== LOAD HOSPITALS & DOCTORS =====
async function loadHospitalsDoctors() {
  try {
    const [hRes, dRes] = await Promise.all([
      fetch(`${API}/hospitals`),
      fetch(`${API}/doctors`)
    ]);
    const hospitals = await hRes.json();
    const doctors = await dRes.json();
    const hList = document.getElementById('hospital-list');
    const dList = document.getElementById('doctor-list');
    hList.innerHTML = hospitals.map(h => `<option value="${h}">`).join('');
    dList.innerHTML = doctors.map(d => `<option value="${d}">`).join('');
  } catch {}
}

// ===== ADD REPORT =====
async function addReport() {
  const phone = document.getElementById('rep-phone').value.trim();
  const hospital = document.getElementById('rep-hospital').value.trim();
  const doctor = document.getElementById('rep-doctor').value.trim();
  if (!phone) { toast('Enter patient phone number', 'error'); return; }
  if (!hospital || !doctor) { toast('Hospital and doctor are required', 'error'); return; }

  const payload = {
    patient_phone: phone,
    hospital_name: hospital,
    doctor_name: doctor,
    visit_date: document.getElementById('rep-date').value,
    report_type: document.getElementById('rep-type').value,
    diagnosis: document.getElementById('rep-diagnosis').value.trim(),
    prescription: document.getElementById('rep-prescription').value.trim(),
    notes: document.getElementById('rep-notes').value.trim()
  };

  try {
    const res = await fetch(`${API}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      toast('Report added successfully!', 'success');
      ['rep-hospital','rep-doctor','rep-diagnosis','rep-prescription','rep-notes'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('rep-patient-info').style.display = 'none';
      document.getElementById('rep-phone').value = '';
    } else {
      toast(data.error || 'Failed to add report', 'error');
    }
  } catch {
    toast('Cannot connect to server', 'error');
  }
}

// ===== SEARCH PATIENT =====
async function searchPatient() {
  const phone = document.getElementById('search-phone').value.trim();
  if (!phone) { toast('Enter a phone number', 'error'); return; }
  const container = document.getElementById('search-result');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⟳</div><p>RETRIEVING RECORDS...</p></div>';
  try {
    const [pRes, rRes] = await Promise.all([
      fetch(`${API}/patient/${phone}`),
      fetch(`${API}/reports/${phone}`)
    ]);
    if (!pRes.ok) { container.innerHTML = notFoundHTML(); return; }
    const patient = await pRes.json();
    const reports = await rRes.json();
    container.innerHTML = buildProfileHTML(patient, reports);
  } catch {
    container.innerHTML = '<div class="empty-state"><p>CONNECTION ERROR</p></div>';
  }
}

// ===== BUILD PROFILE HTML =====
function buildProfileHTML(p, reports) {
  const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const regDate = p.registered_at ? p.registered_at.split(' ')[0] : '—';

  let reportsHTML = '';
  if (reports.length === 0) {
    reportsHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>NO REPORTS FOUND</p></div>';
  } else {
    reportsHTML = `<div class="timeline">` + reports.map(r => `
      <div class="timeline-item">
        <div class="timeline-header">
          <div>
            <div class="timeline-hospital">🏥 ${r.hospital_name || '—'}</div>
            <div class="timeline-doctor">👨‍⚕️ Dr. ${r.doctor_name || '—'}</div>
          </div>
          <div style="text-align:right">
            <div class="timeline-date">${r.visit_date || '—'}</div>
            <div class="report-type-badge">${r.report_type || 'General'}</div>
          </div>
        </div>
        <div class="timeline-body">
          ${r.diagnosis ? `<div class="timeline-field"><div class="timeline-field-label">DIAGNOSIS</div><div class="timeline-field-value">${r.diagnosis}</div></div>` : ''}
          ${r.prescription ? `<div class="timeline-field"><div class="timeline-field-label">PRESCRIPTION</div><div class="timeline-field-value">${r.prescription}</div></div>` : ''}
          ${r.notes ? `<div class="timeline-field"><div class="timeline-field-label">NOTES</div><div class="timeline-field-value">${r.notes}</div></div>` : ''}
        </div>
      </div>
    `).join('') + `</div>`;
  }

  return `
    <div class="patient-profile">
      <div class="profile-header">
        <div class="profile-avatar">${initials}</div>
        <div>
          <div class="profile-name">${p.name}</div>
          <div class="profile-phone">📞 ${p.phone}</div>
        </div>
        <div class="profile-badge">✓ REGISTERED ${regDate}</div>
      </div>
      <div class="profile-grid">
        <div class="profile-field">
          <div class="profile-field-label">AGE</div>
          <div class="profile-field-value">${p.age ? p.age + ' years' : '—'}</div>
        </div>
        <div class="profile-field">
          <div class="profile-field-label">GENDER</div>
          <div class="profile-field-value">${p.gender || '—'}</div>
        </div>
        <div class="profile-field">
          <div class="profile-field-label">BLOOD GROUP</div>
          <div class="profile-field-value">${p.blood_group ? `<span class="blood-badge">${p.blood_group}</span>` : '—'}</div>
        </div>
        <div class="profile-field">
          <div class="profile-field-label">ALLERGIES</div>
          <div class="profile-field-value" style="color:#ff2d78">${p.allergies || 'None'}</div>
        </div>
        <div class="profile-field">
          <div class="profile-field-label">ADDRESS</div>
          <div class="profile-field-value">${p.address || '—'}</div>
        </div>
        <div class="profile-field">
          <div class="profile-field-label">EMERGENCY CONTACT</div>
          <div class="profile-field-value">${p.emergency_contact || '—'} ${p.emergency_phone ? '· ' + p.emergency_phone : ''}</div>
        </div>
      </div>
      <div class="timeline-title">◈ MEDICAL HISTORY — ${reports.length} RECORD(S)</div>
      ${reportsHTML}
    </div>
  `;
}

// ===== NOT FOUND HTML =====
function notFoundHTML() {
  return `<div class="empty-state">
    <div class="empty-icon">◎</div>
    <p>NO PATIENT FOUND WITH THIS PHONE NUMBER</p>
  </div>`;
}

// ===== LOAD ALL PATIENTS =====
async function loadAllPatients() {
  try {
    const res = await fetch(`${API}/patients`);
    const patients = await res.json();
    const tbody = document.getElementById('patients-tbody');
    if (patients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-dim);font-family:Orbitron,sans-serif;font-size:0.65rem;letter-spacing:2px">NO PATIENTS REGISTERED</td></tr>`;
      return;
    }
    tbody.innerHTML = patients.map((p, i) => `
      <tr>
        <td style="color:var(--text-dim);font-family:Orbitron,sans-serif;font-size:0.65rem">${i + 1}</td>
        <td style="font-weight:600;color:var(--cyan)">${p.name}</td>
        <td style="font-family:Orbitron,sans-serif;font-size:0.75rem">${p.phone}</td>
        <td>${p.age || '—'}</td>
        <td>${p.gender || '—'}</td>
        <td>${p.blood_group ? `<span class="blood-badge">${p.blood_group}</span>` : '—'}</td>
        <td style="font-size:0.8rem;color:var(--text-dim)">${p.registered_at ? p.registered_at.split(' ')[0] : '—'}</td>
        <td>
          <button class="btn-danger" onclick="deletePatient('${p.phone}')">DELETE</button>
        </td>
      </tr>
    `).join('');
  } catch {
    toast('Failed to load patients', 'error');
  }
}

// ===== DELETE PATIENT =====
async function deletePatient(phone) {
  if (!confirm(`Delete patient with phone ${phone}? This will also delete all their reports.`)) return;
  try {
    await fetch(`${API}/patient/${phone}`, { method: 'DELETE' });
    toast('Patient deleted', 'success');
    loadAllPatients();
    loadStats();
  } catch {
    toast('Delete failed', 'error');
  }
}

// ===== ENTER KEY SUPPORT =====
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.tab.active').id;
    if (active === 'tab-dashboard') quickSearch();
    if (active === 'tab-search') searchPatient();
  }
});

// ===== INIT =====
checkServer();
loadStats();
setInterval(checkServer, 10000);
