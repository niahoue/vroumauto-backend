// backend/routes/favoriteRoutes.js

import express from 'express';
import { addFavorite, removeFavorite, getFavorites } from '../controllers/favoriteController.js';
import { protect } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Toutes les routes des favoris nécessitent une protection (utilisateur connecté)
router.use(protect);

router.route('/')
  .post(addFavorite)    // POST /api/favorites - Ajouter un favori
  .get(getFavorites);   // GET /api/favorites - Obtenir les favoris de l'utilisateur

router.route('/:vehicleId')
  .delete(removeFavorite); // DELETE /api/favorites/:vehicleId - Retirer un favori

export default router;
