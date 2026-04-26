const db = require('../models/db');

// ─── HELPER : trouver patient_id ──────────
async function getPatientId(userId) {
  const [[patient]] = await db.query(
    'SELECT id FROM patients WHERE user_id = ?', [userId]
  );
  return patient ? patient.id : null;
}

// ─── STATS ───────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ message: 'Patient non trouvé.' });

    const [[{ rdv }]]          = await db.query('SELECT COUNT(*) as rdv FROM rendez_vous WHERE patient_id = ?', [patientId]);
    const [[{ consultations }]] = await db.query('SELECT COUNT(*) as consultations FROM consultations WHERE patient_id = ?', [patientId]);
    const [[{ ordonnances }]]  = await db.query(`
      SELECT COUNT(*) as ordonnances FROM ordonnances o
      JOIN consultations c ON o.consultation_id = c.id
      WHERE c.patient_id = ?
    `, [patientId]);
    const [[{ factures }]] = await db.query(`
      SELECT COALESCE(SUM(prix), 0) as factures 
      FROM consultations WHERE patient_id = ?
    `, [patientId]);

    res.json({ rdv, consultations, ordonnances, factures });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── RENDEZ-VOUS ─────────────────────────
exports.getRendezVous = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    const [rdv] = await db.query(`
      SELECT r.*, u.nom as medecin_nom, m.specialite
      FROM rendez_vous r
      JOIN medecins m ON r.medecin_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE r.patient_id = ?
      ORDER BY r.date DESC
    `, [patientId]);
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.addRendezVous = async (req, res) => {
  const { medecin_id, date, motif } = req.body;
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ message: 'Patient non trouvé.' });

    await db.query(
      'INSERT INTO rendez_vous (patient_id, medecin_id, date, motif, statut) VALUES (?, ?, ?, ?, ?)',
      [patientId, medecin_id, date, motif || null, 'en_attente']
    );

    // Notification au médecin
    const [[medecin]] = await db.query(
      'SELECT user_id FROM medecins WHERE id = ?', [medecin_id]
    );
    if (medecin) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [medecin.user_id, `📅 Nouveau rendez-vous demandé par ${req.user.nom}.`]
      );
    }

    res.status(201).json({ message: 'Rendez-vous demandé avec succès !' });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deleteRendezVous = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    const [[rdv]]   = await db.query('SELECT * FROM rendez_vous WHERE id = ? AND patient_id = ?', [req.params.id, patientId]);

    if (!rdv) return res.status(404).json({ message: 'Rendez-vous non trouvé.' });
    if (rdv.statut === 'confirme') return res.status(400).json({ message: 'Impossible d\'annuler un RDV confirmé.' });

    await db.query('DELETE FROM rendez_vous WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rendez-vous annulé.' });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── DOSSIER MÉDICAL ─────────────────────
exports.getDossier = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);

    const [consultations] = await db.query(`
      SELECT c.*, u.nom as medecin_nom, m.specialite
      FROM consultations c
      JOIN medecins m ON c.medecin_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE c.patient_id = ?
      ORDER BY c.date DESC
    `, [patientId]);

    const [infos] = await db.query(`
      SELECT p.*, u.nom, u.email
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [patientId]);

    res.json({ consultations, infos: infos[0] });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── ORDONNANCES ─────────────────────────
exports.getOrdonnances = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    const [ordonnances] = await db.query(`
      SELECT o.*, u.nom as medecin_nom, c.date as consultation_date
      FROM ordonnances o
      JOIN consultations c ON o.consultation_id = c.id
      JOIN medecins m ON c.medecin_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE c.patient_id = ?
      ORDER BY o.date DESC
    `, [patientId]);
    res.json(ordonnances);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── FACTURES ────────────────────────────
exports.getFactures = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    const [factures] = await db.query(`
      SELECT c.id, c.date, c.prix, u.nom as medecin_nom, m.specialite
      FROM consultations c
      JOIN medecins m ON c.medecin_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE c.patient_id = ? AND c.prix IS NOT NULL
      ORDER BY c.date DESC
    `, [patientId]);
    res.json(factures);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── NOTIFICATIONS ───────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.getNotifCount = async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND lu = FALSE',
      [req.user.id]
    );
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.markRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET lu = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── PROFIL ──────────────────────────────
exports.getProfil = async (req, res) => {
  try {
    const [[profil]] = await db.query(`
      SELECT p.*, u.nom, u.email
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `, [req.user.id]);
    res.json(profil);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.updateProfil = async (req, res) => {
  const { nom, telephone, adresse, date_naissance, sexe } = req.body;
  try {
    await db.query('UPDATE users SET nom = ? WHERE id = ?', [nom, req.user.id]);
    await db.query(
      'UPDATE patients SET telephone = ?, adresse = ?, date_naissance = ?, sexe = ? WHERE user_id = ?',
      [telephone, adresse, date_naissance || null, sexe, req.user.id]
    );
    res.json({ message: 'Profil mis à jour.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};