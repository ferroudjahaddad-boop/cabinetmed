const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// ─── INSCRIPTION (patient uniquement) ────
router.post('/register', authController.register);

// ─── CONNEXION ───────────────────────────
router.post('/login', authController.login);

// ─── CRÉER UN MÉDECIN (admin uniquement) ─
router.post('/create-medecin', verifyToken, isAdmin, authController.createMedecin);

module.exports = router;