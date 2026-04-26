// ─── PROTECTION DES PAGES ────────────────
function checkAccess(roleRequis) {
  const user  = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // pas connecté → retour login
  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  // mauvais rôle → retour login
  if (user.role !== roleRequis) {
    window.location.href = 'login.html';
  }
}

// ─── DÉCONNEXION ─────────────────────────
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ─── TOAST ───────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'error') toast.classList.add('error');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── TOGGLE MOT DE PASSE ─────────────────
function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ─── LOGIN ───────────────────────────────
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value.trim();
  let valid = true;

  document.getElementById('err-email').style.display = 'none';
  document.getElementById('err-pass').style.display  = 'none';

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    document.getElementById('err-email').style.display = 'block';
    valid = false;
  }
  if (!pass) {
    document.getElementById('err-pass').style.display = 'block';
    valid = false;
  }
  if (!valid) return;

  document.getElementById('btn-text').style.display = 'none';
  document.getElementById('spinner').style.display  = 'block';

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await response.json();

    document.getElementById('btn-text').style.display = 'block';
    document.getElementById('spinner').style.display  = 'none';

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showToast('✓ Connexion réussie !');

      setTimeout(() => {
        if (data.user.role === 'admin')   window.location.href = 'dashboard-admin.html';
        if (data.user.role === 'medecin') window.location.href = 'dashboard-medecin.html';
        if (data.user.role === 'patient') window.location.href = 'dashboard-patient.html';
      }, 1200);

    } else {
      showToast(data.message, 'error');
    }

  } catch (error) {
    document.getElementById('btn-text').style.display = 'block';
    document.getElementById('spinner').style.display  = 'none';
    showToast('Erreur de connexion au serveur.', 'error');
  }
}

// ─── REGISTER ────────────────────────────
async function handleRegister() {
  const nom       = document.getElementById('reg-name').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const telephone = document.getElementById('reg-phone').value.trim();
  const password  = document.getElementById('reg-pass').value.trim();

  // ─── VALIDATIONS ──────────────────────
  if (!validerNom(nom)) {
    showToast('Le nom doit contenir uniquement des lettres.', 'error');
    return;
  }
  if (!validerEmail(email)) {
    showToast('Email invalide. Exemple: nom@domaine.com', 'error');
    return;
  }
  if (!validerTelephone(telephone)) {
    showToast('Le téléphone doit contenir exactement 10 chiffres.', 'error');
    return;
  }
  if (!validerMotDePasse(password)) {
    showToast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom,
        email,
        password,
        telephone,
        role: 'patient'  // ← toujours patient
      })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('✓ Compte créé ! Vous pouvez vous connecter.');
      setTimeout(() => switchTab('login', document.querySelector('#tab-login')), 1500);
    } else {
      showToast(data.message, 'error');
    }

  } catch (error) {
    showToast('Erreur de connexion au serveur.', 'error');
  }
}

// ─── ENTER KEY ───────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

// ─── VALIDATIONS ─────────────────────────

function validerNom(nom) {
  // lettres, espaces, tirets, apostrophes seulement
  const regex = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
  return regex.test(nom.trim()) && nom.trim().length >= 2;
}

function validerEmail(email) {
  // accepte les formats email standards avec @ obligatoire
  const regex = /^[^\s]+@[^\s]+\.[^\s]+$/;
  return regex.test(email.trim());
}

function validerTelephone(tel) {
  // exactement 10 chiffres, pas de lettres
  const regex = /^[0-9]{10}$/;
  return regex.test(tel.replace(/\s/g, ''));
}

function validerMotDePasse(pass) {
  // minimum 8 caractères
  return pass.trim().length >= 8;
}

// ─── BLOQUER LETTRES DANS TÉLÉPHONE ──────
function inputTelOnly(e) {
  // autoriser seulement chiffres et backspace
  const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
  if (!/[0-9]/.test(e.key) && !allowed.includes(e.key)) {
    e.preventDefault();
  }
}

// ─── BLOQUER CHIFFRES ET SYMBOLES DANS NOM
function inputNomOnly(e) {
  const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' ', '-', "'", '.'];
  if (!/[a-zA-ZÀ-ÿ]/.test(e.key) && !allowed.includes(e.key)) {
    e.preventDefault();
  }
}

// ─── BADGE NOTIFICATIONS ─────────────────
async function loadNotifCount() {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) return;

  try {
    let url = '';
    if (user.role === 'admin')   url = '/api/admin/notifications/count';
    if (user.role === 'medecin') url = '/api/medecin/notifications/count';
    if (user.role === 'patient') url = '/api/patient/notifications/count';

    const res  = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    const badge = document.getElementById('notif-count');
    if (badge) {
      if (data.count > 0) {
        badge.textContent    = data.count;
        badge.style.display  = 'inline';
      } else {
        badge.style.display  = 'none';
      }
    }

  } catch (e) {
    console.log('Erreur chargement notifications count');
  }
}

// ---APPEL AUTOMATIQUE 
// charger le count au démarrage de chaque page
document.addEventListener('DOMContentLoaded', () => {
  loadNotifCount();
  // rafraîchir toutes les 30 secondes
  setInterval(loadNotifCount, 30000);
});