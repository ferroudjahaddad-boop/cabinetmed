const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// ─── MIDDLEWARES ──────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── SERVIR LES FICHIERS FRONTEND ────────
app.use(express.static(path.join(__dirname, '../Frontend')));
console.log('Chemin frontend:', path.join(__dirname, '../frontend')); // ← ici


// ─── ROUTES API ───────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);

// ─── DÉMARRER LE SERVEUR ──────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});