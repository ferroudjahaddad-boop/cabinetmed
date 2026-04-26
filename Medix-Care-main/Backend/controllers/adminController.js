const db = require('../models/db');

// ─── STATS ───────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [[{ patients }]] = await db.query('SELECT COUNT(*) as patients FROM patients');
    const [[{ medecins }]] = await db.query('SELECT COUNT(*) as medecins FROM medecins');
    const [[{ rdv }]]      = await db.query('SELECT COUNT(*) as rdv FROM rendez_vous WHERE DATE(date) = CURDATE()');
    const [[{ revenus }]]  = await db.query('SELECT COALESCE(SUM(prix), 0) as revenus FROM consultations WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())');

    console.log('Stats:', { patients, medecins, rdv, revenus }); // ← pour déboguer

    res.json({
      patients,
      medecins,
      rdv,
      revenus: revenus || 0
    });

  } catch (error) {
    console.log('Erreur stats:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};
// ─── PATIENTS ────────────────────────────
exports.getPatients = async (req, res) => {
  try {
    const [patients] = await db.query(`
      SELECT p.id, u.nom, u.email, p.telephone, p.sexe, p.date_naissance,p.adresse,u.created_at,COUNT(c.id) as nb_consultations,MAX(c.date) as derniere_visite
      FROM patients p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN consultations c ON c.patient_id = p.id
      GROUP BY p.id
      ORDER BY u.created_at DESC
    `);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    await db.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
    res.json({ message: 'Patient supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── MÉDECINS ────────────────────────────
exports.getMedecins = async (req, res) => {
  try {
    const [medecins] = await db.query(`
      SELECT m.id, u.nom, u.email, m.specialite, m.telephone,
      COUNT(c.id) as total_consultations
      FROM medecins m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN consultations c ON c.medecin_id = m.id
      GROUP BY m.id
      ORDER BY u.nom ASC
    `);
    res.json(medecins);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deleteMedecin = async (req, res) => {
  try {
    await db.query('DELETE FROM medecins WHERE id = ?', [req.params.id]);
    res.json({ message: 'Médecin supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.updateMedecin = async (req, res) => {
  const { nom, specialite, email, telephone } = req.body;
  try {
    await db.query(
      'UPDATE users SET nom = ?, email = ? WHERE id = (SELECT user_id FROM medecins WHERE id = ?)',
      [nom, email, req.params.id]
    );
    await db.query(
      'UPDATE medecins SET specialite = ?, telephone = ? WHERE id = ?',
      [specialite, telephone, req.params.id]
    );
    res.json({ message: 'Médecin modifié avec succès !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
}; // bonjour farou

// ─── RENDEZ-VOUS ─────────────────────────
// adminController.js
exports.getRendezVous = async (req, res) => {
  try {
    const [rdv] = await db.query(`
      SELECT 
        r.id, 
        r.date, 
        r.motif, 
        r.statut,
        r.patient_id,    -- Ajouté pour le bon fonctionnement de l'édition
        r.medecin_id,    -- Ajouté pour le bon fonctionnement de l'édition
        u_p.nom as patient_nom,
        u_m.nom as medecin_nom
      FROM rendez_vous r
      JOIN patients p ON r.patient_id = p.id
      JOIN users u_p ON p.user_id = u_p.id
      JOIN medecins m ON r.medecin_id = m.id
      JOIN users u_m ON m.user_id = u_m.id
      ORDER BY r.date DESC
    `);
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.addRendezVous = async (req, res) => {
  const { patient_id, medecin_id, date, statut, motif } = req.body;
  try {
    await db.query(
      'INSERT INTO rendez_vous (patient_id, medecin_id, date, statut, motif) VALUES (?, ?, ?, ?, ?)',
      [patient_id, medecin_id, date, statut || 'en_attente', motif || null]
    );
    res.status(201).json({ message: 'Rendez-vous ajouté avec succès !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deleteRendezVous = async (req, res) => {
  try {
    await db.query('DELETE FROM rendez_vous WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rendez-vous supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.updateRendezVous = async (req, res) => {
  const { patient_id, medecin_id, date, statut, motif } = req.body;
  try {
    // ─── METTRE À JOUR ───────────────────
    await db.query(
      `UPDATE rendez_vous 
       SET 
         patient_id = COALESCE(?, patient_id),
         medecin_id = COALESCE(?, medecin_id),
         date       = COALESCE(?, date),
         statut     = COALESCE(?, statut),
         motif      = COALESCE(?, motif)
       WHERE id = ?`,
      [patient_id || null, medecin_id || null, date || null, statut || null, motif || null, req.params.id]
    );

    // ─── NOTIFICATION AUTOMATIQUE ────────
    if (statut === 'confirme' || statut === 'annule') {
      const [[rdv]] = await db.query(`
        SELECT r.*, p.user_id as patient_user_id
        FROM rendez_vous r
        JOIN patients p ON r.patient_id = p.id
        WHERE r.id = ?
      `, [req.params.id]);

      let message = '';
      if (statut === 'confirme') message = '✅ Votre rendez-vous a été confirmé.';
      if (statut === 'annule')   message = '❌ Votre rendez-vous a été annulé.';

      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [rdv.patient_user_id, message]
      );

      console.log('✅ Notification envoyée à user_id:', rdv.patient_user_id);
    }

    res.json({ message: 'Rendez-vous mis à jour.' });

  } catch (error) {
    console.log('Erreur updateRendezVous:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── CONSULTATIONS ───────────────────────
exports.getConsultations = async (req, res) => {
  try {
    const [consultations] = await db.query(`
      SELECT c.id, c.date, c.symptomes, c.diagnostic, c.prix,
      u_p.nom as patient_nom,
      u_m.nom as medecin_nom
      FROM consultations c
      JOIN patients p ON c.patient_id = p.id
      JOIN users u_p ON p.user_id = u_p.id
      JOIN medecins m ON c.medecin_id = m.id
      JOIN users u_m ON m.user_id = u_m.id
      ORDER BY c.date DESC
    `);
    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deleteConsultation = async (req, res) => {
  try {
    await db.query('DELETE FROM consultations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Consultation supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};


// ─── FACTURATION ─────────────────────────
exports.getFacturation = async (req, res) => {
  const annee = req.query.annee || new Date().getFullYear();
  try {
    const [facturation] = await db.query(`
      SELECT 
        MONTH(date) as mois,
        YEAR(date)  as annee,
        SUM(prix)   as total,
        COUNT(*)    as nb_consultations
      FROM consultations
      WHERE YEAR(date) = ?
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY mois ASC
    `, [annee]);
    res.json(facturation);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.getFacturationMedecins = async (req, res) => {
  const annee      = req.query.annee || new Date().getFullYear();
  const moisActuel = new Date().getMonth() + 1;
  try {
    const [data] = await db.query(`
      SELECT 
        u.nom,
        m.specialite,
        COUNT(c.id)    as total_consultations,
        SUM(c.prix)    as total_revenus,
        SUM(CASE WHEN MONTH(c.date) = ? AND YEAR(c.date) = ? THEN c.prix ELSE 0 END) as revenus_mois
      FROM medecins m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN consultations c ON c.medecin_id = m.id AND YEAR(c.date) = ?
      GROUP BY m.id
      ORDER BY total_revenus DESC
    `, [moisActuel, annee, annee]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── UTILISATEURS ────────────────────────
exports.getUtilisateurs = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, nom, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deleteUtilisateur = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── MODIFIER PATIENT ─────────────────────
exports.updatePatient = async (req, res) => {
  const { nom, email, telephone, sexe, date_naissance, adresse } = req.body;
  try {
    await db.query(
      'UPDATE users SET nom = ?, email = ? WHERE id = (SELECT user_id FROM patients WHERE id = ?)',
      [nom, email, req.params.id]
    );
    await db.query(
      'UPDATE patients SET telephone = ?, sexe = ?, date_naissance = ?, adresse = ? WHERE id = ?',
      [telephone, sexe, date_naissance || null, adresse, req.params.id]
    );
    res.json({ message: 'Patient modifié avec succès !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── DOSSIER MÉDICAL ─────────────────────
exports.getDossierPatient = async (req, res) => {
  const id = req.params.id;
  try {
    const [consultations] = await db.query(`
      SELECT c.*, u.nom as medecin_nom
      FROM consultations c
      JOIN medecins m ON c.medecin_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE c.patient_id = ?
      ORDER BY c.date DESC
    `, [id]);

    const [ordonnances] = await db.query(`
      SELECT o.*
      FROM ordonnances o
      JOIN consultations c ON o.consultation_id = c.id
      WHERE c.patient_id = ?
      ORDER BY o.date DESC
    `, [id]);

    const [rendezvous] = await db.query(`
      SELECT * FROM rendez_vous
      WHERE patient_id = ?
      ORDER BY date DESC
    `, [id]);

    res.json({ consultations, ordonnances, rendezvous });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

/*--------Ordonnances------------------*/
exports.getOrdonnances = async (req, res) => {
  try {
    const [ordonnances] = await db.query(`
      SELECT o.*, 
        u_p.nom as patient_nom,
        u_m.nom as medecin_nom
      FROM ordonnances o
      JOIN consultations c ON o.consultation_id = c.id
      JOIN patients p ON c.patient_id = p.id
      JOIN users u_p ON p.user_id = u_p.id
      JOIN medecins m ON c.medecin_id = m.id
      JOIN users u_m ON m.user_id = u_m.id
      ORDER BY o.date DESC
    `);
    res.json(ordonnances);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.deleteOrdonnance = async (req, res) => {
  try {
    await db.query('DELETE FROM ordonnances WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ordonnance supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

//--------------NOTIFICATIONS---------------
// ─── GET NOTIFICATIONS ────────────────
exports.getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(`
      SELECT n.*, u.nom as user_nom
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
    `);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};



// ─── MARK READ ────────────────────────
exports.markRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── MARK ALL READ ────────────────────
exports.markAllRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu = TRUE');
    res.json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── DELETE NOTIFICATION ──────────────
exports.deleteNotification = async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

// ─── SEND NOTIFICATION ────────────────
exports.sendNotification = async (req, res) => {
  const { destinataire, message } = req.body;
  try {
    let users = [];

    if (destinataire === 'all') {
      const [all] = await db.query('SELECT id FROM users');
      users = all;
    } else if (destinataire === 'medecins') {
      const [med] = await db.query('SELECT id FROM users WHERE role = "medecin"');
      users = med;
    } else if (destinataire === 'patients') {
      const [pat] = await db.query('SELECT id FROM users WHERE role = "patient"');
      users = pat;
    }

    for (const u of users) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [u.id, message]
      );
    }

    res.json({ message: `Notification envoyée à ${users.length} utilisateur(s).` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
};