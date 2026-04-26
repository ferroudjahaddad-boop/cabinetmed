const express    = require('express');
const router     = express.Router();
const { verifyToken, isPatient } = require('../middleware/authMiddleware');
const patientController = require('../controllers/patientController');

// ─── DASHBOARD ───────────────────────────
router.get('/stats',           verifyToken, isPatient, patientController.getStats);

// ─── RENDEZ-VOUS ─────────────────────────
router.get('/rendezvous',      verifyToken, isPatient, patientController.getRendezVous);
router.post('/rendezvous',     verifyToken, isPatient, patientController.addRendezVous);
router.delete('/rendezvous/:id', verifyToken, isPatient, patientController.deleteRendezVous);

// ─── DOSSIER MÉDICAL ─────────────────────
router.get('/dossier',         verifyToken, isPatient, patientController.getDossier);

// ─── ORDONNANCES ─────────────────────────
router.get('/ordonnances',     verifyToken, isPatient, patientController.getOrdonnances);

// ─── FACTURES ────────────────────────────
router.get('/factures',        verifyToken, isPatient, patientController.getFactures);

// ─── NOTIFICATIONS ───────────────────────
router.get('/notifications',         verifyToken, isPatient, patientController.getNotifications);
router.get('/notifications/count',   verifyToken, isPatient, patientController.getNotifCount);
router.put('/notifications/:id/read', verifyToken, isPatient, patientController.markRead);

// ─── PROFIL ──────────────────────────────
router.get('/profil',          verifyToken, isPatient, patientController.getProfil);
router.put('/profil',          verifyToken, isPatient, patientController.updateProfil);

module.exports = router;