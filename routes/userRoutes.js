// backend/routes/userRoutes.js

import express from 'express';
import { getUsers, getUser, updateUser, deleteUser, toggleFavoriteVehicle, getFavoriteVehicles } from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js'; // Importe les middlewares d'authentification

const router = express.Router();

// Applique le middleware de protection à toutes les routes ci-dessous
router.use(protect); // Toutes les routes qui suivent nécessitent un token valide

// Routes d'administration (nécessitent l'autorisation 'admin')
router.route('/')
  .get(authorize('admin'), getUsers); // GET /api/users - Obtenir tous les utilisateurs

// NOUVELLES ROUTES POUR LES FAVORIS (accessibles aux utilisateurs normaux ET aux admins, mais protégées)
router.route('/favorites/toggle')
  .post(authorize('user', 'admin'), toggleFavoriteVehicle); // POST /api/users/favorites/toggle - Ajouter/retirer un véhicule aux favoris
                                                            // Autorise explicitement les rôles 'user' et 'admin'

router.route('/favorites')
  .get(authorize('user', 'admin'), getFavoriteVehicles);    // GET /api/users/favorites - Obtenir les véhicules favoris de l'utilisateur
                                                            // Autorise explicitement les rôles 'user' et 'admin'

router.route('/:id')
  .get(authorize('admin'), getUser)       // GET /api/users/:id - Obtenir un utilisateur spécifique
  .put(authorize('admin'), updateUser)  // PUT /api/users/:id - Mettre à jour un utilisateur (rôle et/ou statut actif)
  .delete(authorize('admin'), deleteUser);  // DELETE /api/users/:id - Supprimer un utilisateur

export default router;
