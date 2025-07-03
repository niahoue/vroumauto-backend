// backend/server.js

// CHARGEZ LES VARIABLES D'ENVIRONNEMENT EN PREMIER !
// C'est CRUCIAL que ces lignes soient au tout début du fichier.
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import testDriveRoutes from './routes/testDriveRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js'; // Importez les routes des favoris
import cloudinary from 'cloudinary';

const app = express();
app.set('trust proxy', 1);
// Configuration Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  credentials: true,
  optionsSuccessStatus: 200
};
// Connexion à la base de données
connectDB();

// Activer CORS pour toutes les requêtes web
app.use(cors( corsOptions));
// Middleware pour parser le JSON des requêtes
app.use(express.json({ limit: '50mb' })); 

// Sécuriser les en-têtes HTTP avec Helmet
app.use(helmet());

// Limiteur de taux de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par windowMs
  message: JSON.stringify({ success: false, msg: 'Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes.' }), // Message JSON
  statusCode: 429, // Too Many Requests
  headers: true, // Inclure les en-têtes X-RateLimit-*
});
app.use(limiter);


// Définir une route de test simple
app.get('/', (req, res) => {
  res.send('API Vroum-Auto est opérationnelle !');
});

// Monter les routes d'authentification
app.use('/api/auth', authRoutes);

// Monter les routes des véhicules
app.use('/api/vehicles', vehicleRoutes);

// Monter les routes des utilisateurs (pour le back-office admin)
app.use('/api/users', userRoutes);

// Monter les routes des réservations
app.use('/api/reservations', reservationRoutes);

// Monter les routes des demandes d'essai
app.use('/api/testdrives', testDriveRoutes);

// Monter les routes des favoris (AJOUTÉ POUR S'ASSURER QU'ELLES SONT CHARGÉES)
app.use('/api/favorites', favoriteRoutes);

// Middleware de gestion des erreurs personnalisées
app.use((err, req, res, next) => {
  // Console.error pour voir l'erreur complète sur le serveur
  console.error(err.stack);

  // Initialiser un objet d'erreur avec un statut et un message par défaut
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Gérer les erreurs spécifiques de Mongoose
  if (err.name === 'CastError') {
    const message = `Ressource non trouvée avec l'ID ${err.value}`;
    error = { statusCode: 404, message: message };
  }

  if (err.code === 11000) { // Erreur de duplication de clé MongoDB
    const message = `Valeur de champ en double: ${Object.keys(err.keyValue)}`;
    error = { statusCode: 400, message: message };
  }

  if (err.name === 'ValidationError') { // Erreurs de validation Mongoose
    const messages = Object.values(err.errors).map(val => val.message);
    error = { statusCode: 400, message: messages.join(', ') };
  }

  // --- NOUVEAU: Gérer spécifiquement les erreurs de express-rate-limit ---
  // express-rate-limit place l'erreur sur err.statusCode et err.message
  if (err.statusCode === 429 && err.message === 'Too Many Requests') {
      error = { statusCode: 429, message: 'Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes.' };
  }
  // --- FIN NOUVEAU ---

  // Si la réponse est déjà en cours d'envoi (headers sent), passer au prochain handler (Express le gérera)
  if (res.headersSent) {
    return next(err);
  }

  // Envoyer une réponse JSON pour toutes les erreurs API
  res.status(error.statusCode).json({
    success: false,
    error: error.message || 'Erreur serveur inconnue',
  });
});


// Port du serveur
const PORT = process.env.PORT || 5000;

// Démarrer le serveur
const server = app.listen(
  PORT,
  console.log(`Serveur démarré en mode ${process.env.NODE_ENV} sur le port ${PORT}`)
);

// Gérer les promesses non gérées
process.on('unhandledRejection', (err, promise) => {
  console.error(`Erreur: ${err.message}`);
  // Fermer le serveur et quitter le processus
  server.close(() => process.exit(1));
});
