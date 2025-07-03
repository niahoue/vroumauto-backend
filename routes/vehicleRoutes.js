// backend/routes/vehicleRoutes.js

import express from 'express';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleAdditionStats // Importe la nouvelle fonction de statistiques
} from '../controllers/vehicleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route pour les statistiques d'ajout de véhicules
router.route('/stats/additions')
  .get(protect, authorize('admin'), getVehicleAdditionStats); // Protégée par admin

router.route('/')
  .get(getVehicles) // GET /api/vehicles - Accessible publiquement pour afficher les véhicules
  .post(protect, authorize('admin'), createVehicle); // POST /api/vehicles - Nécessite d'être connecté et admin pour créer

router.route('/:id')
  .get(getVehicle) // GET /api/vehicles/:id - Accessible publiquement pour afficher les détails d'un véhicule
  .put(protect, authorize('admin'), updateVehicle) // PUT /api/vehicles/:id - Nécessite d'être connecté et admin pour modifier
  .delete(protect, authorize('admin'), deleteVehicle); // DELETE /api/vehicles/:id - Nécessite d'être connecté et admin pour supprimer

export default router;
