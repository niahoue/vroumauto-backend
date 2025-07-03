// backend/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protéger les routes
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtenir le token de l'en-tête
      token = req.headers.authorization.split(' ')[1];

      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attacher l'utilisateur à la requête (sans le mot de passe)
      // IMPORTANT: Trimmez le rôle ici pour qu'il soit propre pour tous les middlewares suivants
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        // Créez un nouvel objet utilisateur avec le rôle trimé
        req.user = {
          id: user._id,
          email: user.email,
          // S'assurer que le rôle est une chaîne et qu'il est bien trimé
          role: user.role ? String(user.role).trim() : 'user'
        };
      } else {
        return res.status(404).json({ success: false, msg: 'Utilisateur associé au token introuvable' });
      }
      next();
    } catch (error) {
      console.error('Erreur de validation du token:', error);
      // Différenciez les messages d'erreur pour aider au débogage frontend
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, msg: 'Non autorisé, token expiré' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, msg: 'Non autorisé, token invalide' });
      }
      return res.status(401).json({ success: false, msg: 'Non autorisé, veuillez vous connecter' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, msg: 'Non autorisé, pas de token' });
  }
};

// Autoriser l'accès à des rôles spécifiques
export const authorize = (...roles) => {
  return (req, res, next) => {
   
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, msg: 'Non autorisé, informations utilisateur manquantes' });
    }
    // Le rôle de req.user.role devrait déjà être trimé par le middleware protect
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, msg: `L'utilisateur avec le rôle '${req.user.role}' n'est pas autorisé à accéder à cette ressource` });
    }
    next();
  };
};
