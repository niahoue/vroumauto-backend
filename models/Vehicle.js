// backend/models/Vehicle.js

import mongoose from 'mongoose';

// Définition du schéma du véhicule
const VehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du véhicule est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  type: {
    type: String,
    required: [true, 'Le type de véhicule (buy/rent) est requis'],
    enum: ['buy', 'rent'], // 'buy' pour à vendre, 'rent' pour à louer
  },
  brand: {
    type: String,
    required: [true, 'La marque est requise'],
    trim: true,
    maxlength: [50, 'La marque ne peut pas dépasser 50 caractères']
  },
  model: {
    type: String,
    required: [true, 'Le modèle est requis'],
    trim: true,
    maxlength: [50, 'Le modèle ne peut pas dépasser 50 caractères']
  },
  year: {
    type: Number,
    required: [true, 'L\'année est requise'],
    min: [1900, 'L\'année doit être valide'],
    max: [new Date().getFullYear() + 2, 'L\'année ne peut pas être dans le futur lointain'] // +2 pour permettre les modèles à venir
  },
  mileage: { // Kilométrage, pertinent pour les véhicules à vendre
    type: Number,
    min: [0, 'Le kilométrage ne peut pas être négatif'],
    required: function() { return this.type === 'buy'; } // Requis si le type est 'buy'
  },
  fuel: {
    type: String,
    required: [true, 'Le type de carburant est requis'],
    enum: ['Essence', 'Diesel', 'Électrique', 'Hybride', 'Autre']
  },
  price: { // Prix pour les véhicules à vendre
    type: Number,
    min: [0, 'Le prix ne peut pas être négatif'],
    required: function() { return this.type === 'buy'; } // Requis si le type est 'buy'
  },
  dailyRate: { // Tarif journalier pour les véhicules à louer
    type: Number,
    min: [0, 'Le tarif journalier ne peut pas être négatif'],
    required: function() { return this.type === 'rent'; } // Requis si le type est 'rent'
  },
  passengers: { // Nombre de passagers pour les véhicules à louer
    type: Number,
    min: [1, 'Doit avoir au moins 1 passager'],
    required: function() { return this.type === 'rent'; } // Requis si le type est 'rent'
  },
  description: {
    type: String,
    required: [true, 'Une description est requise'],
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
  },
  // MISE À JOUR IMPORTANTE POUR CLOUDINARY
  images: {
    type: [String], // Tableau de chaînes (URLs d'images de Cloudinary)
    required: [true, 'Au moins une image est requise pour le véhicule'],
    validate: {
      validator: function(v) {
        // Validation simple pour s'assurer que chaque élément est une URL valide si non vide
        // ou une chaîne Base64 commençant par 'data:image' pour les uploads
        if (!v || v.length === 0) return false;
        return v.every(url => {
          return (
            (typeof url === 'string' && url.startsWith('http')) || // URL existante
            (typeof url === 'string' && url.startsWith('data:image')) // Nouvelle image Base64
          );
        });
      },
      message: 'Veuillez fournir un tableau d\'URLs d\'images valides ou de données Base64 valides.'
    }
  },
  isFeatured: {
  type: Boolean,
  default: false // Par défaut, un véhicule n'est pas "en vedette"
},
  specs: { // Spécifications dynamiques (ex: { "couleur": "rouge", "transmission": "automatique" })
    type: Map,
    of: String
  },
  user: { // Référence à l'utilisateur (admin) qui a créé le véhicule
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Option pour inclure les timestamps createdAt et updatedAt automatiquement
  timestamps: true
});

export default mongoose.model('Vehicle', VehicleSchema);
