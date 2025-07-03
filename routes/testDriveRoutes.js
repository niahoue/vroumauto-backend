// backend/routes/testDriveRoutes.js

import express from 'express';
import { createTestDrive, cancelTestDrive, getMyTestDrives, updateTestDriveStatus, getTestDriveStatusStats } from '../controllers/testDriveController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Routes pour les utilisateurs connectés
router.route('/')
  .post(protect, createTestDrive); // Créer une demande d'essai

router.route('/my')
  .get(protect, getMyTestDrives); // Obtenir les demandes d'essai de l'utilisateur (ou toutes pour admin)

  // Route pour les statistiques de demande d'essai
router.route('/stats/status')
  .get(protect, authorize('admin'), getTestDriveStatusStats); // Protégée par admin

router.route('/:id/cancel')
  .put(protect, cancelTestDrive); // Annuler une demande d'essai

// Routes pour les administrateurs
router.route('/:id/status')
  .put(protect, authorize('admin'), updateTestDriveStatus); // Mettre à jour le statut (Admin)



export default router;
