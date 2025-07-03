// backend/models/Favorite.js

import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema({
  // Référence à l'utilisateur qui a ajouté le véhicule aux favoris
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // Fait référence au modèle User
    required: [true, 'L\'utilisateur est requis pour un favori']
  },
  // Référence au véhicule qui est ajouté aux favoris
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle', // Fait référence au modèle Vehicle
    required: [true, 'Le véhicule est requis pour un favori']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Assurez-vous qu'un utilisateur ne peut pas ajouter le même véhicule deux fois à ses favoris
FavoriteSchema.index({ user: 1, vehicle: 1 }, { unique: true });

export default mongoose.model('Favorite', FavoriteSchema);
