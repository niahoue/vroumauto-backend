// backend/controllers/favoriteController.js

import Favorite from '../models/Favorite.js';
import Vehicle from '../models/Vehicle.js'; // Pour peupler les détails du véhicule si nécessaire

// @desc    Ajouter un véhicule aux favoris
// @route   POST /api/favorites
// @access  Private
export const addFavorite = async (req, res) => {
  const { vehicleId } = req.body;
  const userId = req.user.id; // ID de l'utilisateur connecté via le middleware protect

  if (!vehicleId) {
    return res.status(400).json({ success: false, msg: 'L\'ID du véhicule est requis.' });
  }

  try {
    // Vérifier si le véhicule existe
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé.' });
    }

    // Créer un nouveau favori
    const favorite = await Favorite.create({ user: userId, vehicle: vehicleId });

    res.status(201).json({ success: true, data: favorite, msg: 'Véhicule ajouté aux favoris.' });
  } catch (err) {
    console.error('Erreur lors de l\'ajout du favori:', err);
    if (err.code === 11000) { // Erreur de doublon MongoDB (code 11000)
      return res.status(409).json({ success: false, msg: 'Ce véhicule est déjà dans vos favoris.' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de l\'ajout aux favoris.' });
  }
};

// @desc    Retirer un véhicule des favoris
// @route   DELETE /api/favorites/:vehicleId
// @access  Private
export const removeFavorite = async (req, res) => {
  const { vehicleId } = req.params;
  const userId = req.user.id; // ID de l'utilisateur connecté

  try {
    const favorite = await Favorite.findOneAndDelete({ user: userId, vehicle: vehicleId });

    if (!favorite) {
      return res.status(404).json({ success: false, msg: 'Favori non trouvé ou déjà retiré.' });
    }

    res.status(200).json({ success: true, data: {}, msg: 'Véhicule retiré des favoris.' });
  } catch (err) {
    console.error('Erreur lors du retrait du favori:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors du retrait des favoris.' });
  }
};

// @desc    Obtenir tous les favoris d'un utilisateur
// @route   GET /api/favorites
// @access  Private
export const getFavorites = async (req, res) => {
  const userId = req.user.id; // ID de l'utilisateur connecté

  try {
    const favorites = await Favorite.find({ user: userId }).populate('vehicle'); // Peupler les détails du véhicule
    
    // Filtrer les favoris pour exclure ceux dont le véhicule n'existe plus
    const validFavorites = favorites.filter(fav => fav.vehicle !== null);

    res.status(200).json({ success: true, count: validFavorites.length, data: validFavorites });
  } catch (err) {
    console.error('Erreur lors de la récupération des favoris:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des favoris.' });
  }
};
