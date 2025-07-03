// backend/routes/authRoutes.js

import express from 'express';
import { register, login, forgotPassword, getMe, resetPassword,contactUs } from '../controllers/authController.js'; // Importe la nouvelle fonction forgotPassword, et getMe, resetPassword
import { protect } from '../middlewares/authMiddleware.js'; // Importe protect

const router = express.Router();

// Définition des routes d'authentification
router.post('/register', register); // Route pour l'inscription d'un nouvel utilisateur
router.post('/login', login);     // Route pour la connexion d'un utilisateur existant
router.post('/forgotpassword', forgotPassword); // Nouvelle route pour la demande de réinitialisation de mot de passe
router.post('/contact',contactUs)
router.put('/resetpassword/:resetToken', resetPassword); // Nouvelle route pour réinitialiser le mot de passe
router.get('/me', protect, getMe); // Route protégée pour obtenir les informations de l'utilisateur connecté


export default router; // Exporte le routeur
