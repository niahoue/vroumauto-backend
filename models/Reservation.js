// backend/models/Reservation.js

import mongoose from 'mongoose';

const ReservationSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: [true, 'La réservation doit être liée à un véhicule.']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'La réservation doit être liée à un utilisateur.']
  },
  startDate: {
    type: Date,
    required: [true, 'La date de début de la réservation est requise.']
  },
  endDate: {
    type: Date,
    required: [true, 'La date de fin de la réservation est requise.']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  totalPrice: { // Pourrait être calculé au moment de la confirmation
    type: Number,
    required: false // Pas toujours requis à la création initiale
  },
  message: { // Message additionnel de l'utilisateur
    type: String,
    maxlength: [500, 'Le message ne peut pas dépasser 500 caractères.']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validation pour s'assurer que la date de fin est après la date de début
ReservationSchema.path('endDate').validate(function(value) {
  return this.startDate <= value;
}, 'La date de fin doit être postérieure ou égale à la date de début.');

export default mongoose.model('Reservation', ReservationSchema);
