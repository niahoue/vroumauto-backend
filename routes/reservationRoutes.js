// backend/routes/reservationRoutes.js

import express from 'express';
import { createReservation, cancelReservation, getMyReservations, updateReservationStatus, getReservationStatusStats } from '../controllers/reservationController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Routes pour les utilisateurs connectés
router.route('/')
  .post(protect, createReservation); // Créer une réservation

router.route('/my')
  .get(protect, getMyReservations); // Obtenir les réservations de l'utilisateur (ou toutes pour admin)

  // Route pour les statistiques de réservation
router.route('/stats/status')
  .get(protect, authorize('admin'), getReservationStatusStats); // Protégée par admin

router.route('/:id/cancel')
  .put(protect, cancelReservation); // Annuler une réservation

// Routes pour les administrateurs
router.route('/:id/status')
  .put(protect, authorize('admin'), updateReservationStatus); // Mettre à jour le statut (Admin)



export default router;
