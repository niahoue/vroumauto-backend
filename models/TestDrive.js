// backend/models/TestDrive.js

import mongoose from 'mongoose';

const TestDriveSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: [true, 'La demande d\'essai doit être liée à un véhicule.']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'La demande d\'essai doit être liée à un utilisateur.']
  },
  testDriveDate: {
    type: Date,
    required: [true, 'La date de l\'essai est requise.']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
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

// Validation pour s'assurer que la date d'essai n'est pas dans le passé
TestDriveSchema.path('testDriveDate').validate(function(value) {
  return value >= new Date();
}, 'La date de l\'essai ne peut pas être dans le passé.');

export default mongoose.model('TestDrive', TestDriveSchema);
