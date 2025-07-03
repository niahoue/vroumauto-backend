// backend/models/User.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // Pour générer des tokens aléatoires

// Définition du schéma de l'utilisateur
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'L\'adresse email est requise'],
    unique: true,
    match: [
      /^(([^<>()\[\]\\.,;:\s@"]+(\\.[^<>()\[\]\\.,;:\\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-1]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Veuillez utiliser une adresse email valide'
    ]
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas renvoyer le mot de passe dans les requêtes par défaut
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: { // NOUVEAU CHAMP : Statut actif de l'utilisateur (pour blocage/déblocage)
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Nouveaux champs pour la réinitialisation du mot de passe
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // NOUVEAU CHAMP: Tableau des IDs des véhicules favoris
  favorites: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Vehicle' // Référence au modèle Vehicle
    }
  ]
});

// Middleware Mongoose pour hacher le mot de passe avant de sauvegarder l'utilisateur
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode personnalisée pour comparer les mots de passe
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Méthode personnalisée pour générer et hacher le token de réinitialisation de mot de passe
UserSchema.methods.getResetPasswordToken = function() {
  // Générer un token aléatoire de 20 octets
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hacher le token et le stocker dans resetPasswordToken
  // Utiliser sha256 pour le hachage
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Définir l'expiration du token à 10 minutes
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken; // Retourner le token non haché
};

export default mongoose.model('User', UserSchema);
