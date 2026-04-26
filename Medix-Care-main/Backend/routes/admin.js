const express    = require('express');
const router     = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// ─── STATS TABLEAU DE BORD ───────────────
router.get('/stats', verifyToken, isAdmin, adminController.getStats);

// ─── PATIENTS ────────────────────────────
router.get('/patients',        verifyToken, isAdmin, adminController.getPatients);
router.delete('/patients/:id', verifyToken, isAdmin, adminController.deletePatient);
router.put('/patients/:id',        verifyToken, isAdmin, adminController.updatePatient);
router.get('/patients/:id/dossier', verifyToken, isAdmin, adminController.getDossierPatient);

// ─── MÉDECINS ────────────────────────────
router.get('/medecins',        verifyToken, isAdmin, adminController.getMedecins);
router.put('/medecins/:id',    verifyToken, isAdmin, adminController.updateMedecin);  // ← ajouter
router.delete('/medecins/:id', verifyToken, isAdmin, adminController.deleteMedecin);

// ─── RENDEZ-VOUS ─────────────────────────
router.get('/rendezvous',     verifyToken, isAdmin, adminController.getRendezVous);
router.put('/rendezvous/:id', verifyToken, isAdmin, adminController.updateRendezVous);
router.post('/rendezvous', verifyToken, isAdmin, adminController.addRendezVous);
router.delete('/rendezvous/:id', verifyToken, isAdmin, adminController.deleteRendezVous);
// ─── CONSULTATIONS ───────────────────────
router.get('/consultations', verifyToken, isAdmin, adminController.getConsultations);
router.delete('/consultations/:id', verifyToken, isAdmin, adminController.deleteConsultation);

// ─── FACTURATION ─────────────────────────
router.get('/facturation', verifyToken, isAdmin, adminController.getFacturation);
router.get('/facturation/medecins', verifyToken, isAdmin, adminController.getFacturationMedecins);


// ─── UTILISATEURS ────────────────────────
router.get('/utilisateurs',        verifyToken, isAdmin, adminController.getUtilisateurs);
router.delete('/utilisateurs/:id', verifyToken, isAdmin, adminController.deleteUtilisateur);

//------Ordonnances---------------------
router.get('/ordonnances',        verifyToken, isAdmin, adminController.getOrdonnances);
router.delete('/ordonnances/:id', verifyToken, isAdmin, adminController.deleteOrdonnance);

//----------NOTIFICATION-------------------
router.get('/notifications',           verifyToken, isAdmin, adminController.getNotifications);
router.put('/notifications/:id/read',  verifyToken, isAdmin, adminController.markRead);
router.put('/notifications/read-all',  verifyToken, isAdmin, adminController.markAllRead);
router.delete('/notifications/:id',    verifyToken, isAdmin, adminController.deleteNotification);
router.post('/notifications/send',     verifyToken, isAdmin, adminController.sendNotification);

module.exports = router;