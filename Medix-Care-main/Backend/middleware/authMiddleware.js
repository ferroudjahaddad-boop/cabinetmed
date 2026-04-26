const jwt = require('jsonwebtoken');
require('dotenv').config();

// ─── VÉRIFIER LE TOKEN ────────────────────
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide.' });
  }
};

// ─── VÉRIFIER LE RÔLE ADMIN ──────────────
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Admins uniquement.' });
  }
  next();
};

// ─── VÉRIFIER LE RÔLE MÉDECIN ────────────
exports.isMedecin = (req, res, next) => {
  if (req.user.role !== 'medecin') {
    return res.status(403).json({ message: 'Accès refusé. Médecins uniquement.' });
  }
  next();
};

// ─── VÉRIFIER LE RÔLE PATIENT ────────────
exports.isPatient = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Accès refusé. Patients uniquement.' });
  }
  next();
};

// ─── ADMIN OU MÉDECIN ────────────────────
exports.isAdminOrMedecin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'medecin') {
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  next();
};