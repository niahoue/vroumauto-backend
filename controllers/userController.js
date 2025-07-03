// backend/controllers/userController.js

import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js'; // Importé pour peupler les favoris
import { sendEmail } from '../utils/emailService.js'; // Pour les notifications de blocage/déblocage

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    // Récupère tous les utilisateurs sauf leur mot de passe
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
};

// @desc    Obtenir un seul utilisateur par ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération de l\'utilisateur' });
  }
};

// @desc    Mettre à jour un utilisateur (rôle et/ou statut actif)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  const { role, isActive } = req.body; // Peut recevoir le rôle et/ou isActive
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé' });
    }

    // Prévention: Un admin ne peut pas modifier son propre rôle ou statut via cette route
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Vous ne pouvez pas modifier votre propre compte via cette interface.' });
    }

    // Mettre à jour le rôle si fourni et si c'est différent
    if (role !== undefined && user.role !== role) {
      user.role = role;
    }

    // Mettre à jour le statut isActive si fourni et si c'est différent
    if (isActive !== undefined && user.isActive !== isActive) {
      // Si on essaie de bloquer un autre admin
      if (user.role === 'admin' && isActive === false && req.user.id !== user._id.toString()) {
        return res.status(403).json({ success: false, msg: 'Impossible de bloquer un autre administrateur.' });
      }

      user.isActive = isActive;

      // Envoyer un email de notification à l'utilisateur dont le statut a changé
      const subject = isActive ? 'Votre compte Vroum-Auto a été débloqué' : 'Votre compte Vroum-Auto a été bloqué';
      const htmlContent = `
        <p>Bonjour ${user.email},</p>
        <p>Votre compte sur Vroum-Auto a été ${isActive ? '<b>débloqué</b>' : '<b>bloqué</b>'} par un administrateur.</p>
        ${isActive ? '<p>Vous pouvez maintenant vous connecter et utiliser nos services normalement.</p>' : '<p>Si vous pensez que c\'est une erreur, veuillez nous contacter.</p>'}
        <p>L'équipe Vroum-Auto</p>
      `;
      await sendEmail({
        email: user.email,
        subject: subject,
        html: htmlContent
      });
    }

    await user.save();

    res.status(200).json({ success: true, data: user, msg: 'Utilisateur mis à jour avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la mise à jour de l\'utilisateur.' });
  }
};


// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé' });
    }

    // Empêcher un admin de supprimer un autre admin ou de se supprimer lui-même
    if (user.role === 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Impossible de supprimer un autre administrateur.' });
    }
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    await user.deleteOne(); // Utiliser deleteOne() sur l'instance du document

    // Optionnel: Envoyer un email de notification à l'utilisateur supprimé
    await sendEmail({
      email: user.email,
      subject: 'Votre compte Vroum-Auto a été supprimé',
      html: `
        <p>Bonjour ${user.email},</p>
        <p>Votre compte sur Vroum-Auto a été supprimé par un administrateur.</p>
        <p>Si vous pensez que c'est une erreur, veuillez nous contacter.</p>
        <p>L'équipe Vroum-Auto</p>
      `
    });

    res.status(200).json({ success: true, data: {}, msg: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la suppression de l\'utilisateur' });
  }
};

// @desc    Ajouter/Retirer un véhicule aux favoris de l'utilisateur
// @route   POST /api/users/favorites/toggle
// @access  Private
export const toggleFavoriteVehicle = async (req, res) => {
  const { vehicleId } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé.' });
    }

    const vehicleExists = await Vehicle.findById(vehicleId);
    if (!vehicleExists) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé.' });
    }

    // Vérifier si le véhicule est déjà dans les favoris
    const isFavorite = user.favorites.includes(vehicleId);

    let message;
    if (isFavorite) {
      // Retirer des favoris
      user.favorites = user.favorites.filter(favId => favId.toString() !== vehicleId);
      message = 'Véhicule retiré des favoris.';
    } else {
      // Ajouter aux favoris
      user.favorites.push(vehicleId);
      message = 'Véhicule ajouté aux favoris.';
    }

    await user.save();

    res.status(200).json({ success: true, msg: message, data: user.favorites });
  } catch (err) {
    console.error('Erreur lors de l\'ajout/retrait aux favoris:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la mise à jour des favoris.' });
  }
};

// @desc    Obtenir les véhicules favoris de l'utilisateur
// @route   GET /api/users/favorites
// @access  Private
export const getFavoriteVehicles = async (req, res) => {
  try {
    const userId = req.user.id; // ID de l'utilisateur connecté

    // Trouver l'utilisateur et peupler le champ 'favorites' avec les détails complets des véhicules
    const user = await User.findById(userId).populate({
      path: 'favorites',
      select: 'name brand model year price dailyRate mileage passengers images coverImageIndex type isFeatured' // Sélectionner les champs nécessaires
    });

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé.' });
    }

    // Filtrer les véhicules null si certains IDs de favoris ne correspondent plus à des véhicules existants
    const validFavorites = user.favorites.filter(vehicle => vehicle !== null);

    res.status(200).json({ success: true, count: validFavorites.length, data: validFavorites });
  } catch (err) {
    console.error('Erreur lors de la récupération des favoris:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des favoris.' });
  }
};
