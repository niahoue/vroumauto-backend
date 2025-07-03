// backend/controllers/reservationController.js

import Reservation from '../models/Reservation.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';

// @desc    Créer une nouvelle réservation
// @route   POST /api/reservations
// @access  Private (Utilisateur)
export const createReservation = async (req, res) => {
  const { vehicle: vehicleId, startDate, endDate, message } = req.body;
  const userId = req.user.id; // ID de l'utilisateur authentifié

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé.' });
    }

    if (vehicle.type !== 'rent') {
      return res.status(400).json({ success: false, msg: 'Ce véhicule n\'est pas disponible à la location.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé.' });
    }

    const reservation = await Reservation.create({
      vehicle: vehicleId,
      user: userId,
      startDate,
      endDate,
      message,
      status: 'pending' // La réservation est en attente de confirmation
    });

    // Envoyer un email de confirmation à l'utilisateur
    const confirmationHtmlUser = `
      <p>Bonjour ${user.email},</p>
      <p>Nous avons bien reçu votre demande de réservation pour le véhicule <strong>${vehicle.brand} ${vehicle.model} (${vehicle.year})</strong>.</p>
      <p>Détails de votre demande :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${vehicle.name}</li>
        <li><strong>Période :</strong> Du ${new Date(startDate).toLocaleDateString()} au ${new Date(endDate).toLocaleDateString()}</li>
        <li><strong>Statut :</strong> En attente de confirmation</li>
      </ul>
      <p>Nous allons examiner votre demande et vous recontacterons très prochainement pour confirmer la disponibilité et les modalités de paiement.</p>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>L'équipe Vroum-Auto</p>
    `;

    // Envoyer un email de notification à l'administrateur
    const notificationHtmlAdmin = `
      <p>Nouvelle demande de réservation reçue :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${vehicle.name} (ID: ${vehicleId})</li>
        <li><strong>Utilisateur :</strong> ${user.email} (ID: ${userId})</li>
        <li><strong>Période :</strong> Du ${new Date(startDate).toLocaleDateString()} au ${new Date(endDate).toLocaleDateString()}</li>
        <li><strong>Message :</strong> ${message || 'Aucun message.'}</li>
      </ul>
      <p>Veuillez confirmer ou annuler cette réservation via le tableau de bord administrateur.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Confirmation de votre demande de réservation Vroum-Auto',
      html: confirmationHtmlUser
    });

    await sendEmail({
      email: process.env.EMAIL_ADMIN_RECIPIENT || process.env.EMAIL_USER, // Envoyer à l'admin
      subject: `[Nouvelle Réservation] ${vehicle.name} par ${user.email}`,
      html: notificationHtmlAdmin
    });

    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    console.error('Erreur lors de la création de la réservation:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création de la réservation.' });
  }
};

// @desc    Annuler une réservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private (Utilisateur ou Admin)
export const cancelReservation = async (req, res) => {
  const { id } = req.params; // ID de la réservation
  const userId = req.user.id; // ID de l'utilisateur authentifié
  const userRole = req.user.role; // Rôle de l'utilisateur authentifié

  try {
    const reservation = await Reservation.findById(id).populate('vehicle').populate('user');
    if (!reservation) {
      return res.status(404).json({ success: false, msg: 'Réservation non trouvée.' });
    }

    // Autorisation: Seul l'utilisateur qui a fait la réservation ou un admin peut annuler
    if (reservation.user._id.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, msg: 'Non autorisé à annuler cette réservation.' });
    }

    if (reservation.status === 'cancelled' || reservation.status === 'completed') {
      return res.status(400).json({ success: false, msg: 'Cette réservation a déjà été annulée ou complétée.' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    // Envoyer un email de confirmation d'annulation à l'utilisateur
    const cancellationHtmlUser = `
      <p>Bonjour ${reservation.user.email},</p>
      <p>Votre réservation pour le véhicule <strong>${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.year})</strong> a été annulée avec succès.</p>
      <p>Détails de la réservation annulée :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${reservation.vehicle.name}</li>
        <li><strong>Période :</strong> Du ${new Date(reservation.startDate).toLocaleDateString()} au ${new Date(reservation.endDate).toLocaleDateString()}</li>
        <li><strong>Statut :</strong> Annulée</li>
      </ul>
      <p>Si vous avez annulé par erreur ou si vous avez des questions, veuillez nous contacter.</p>
      <p>L'équipe Vroum-Auto</p>
    `;

    // Envoyer un email de notification à l'administrateur
    const notificationHtmlAdmin = `
      <p>Une réservation a été annulée :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${reservation.vehicle.name} (ID: ${reservation.vehicle._id})</li>
        <li><strong>Utilisateur :</strong> ${reservation.user.email} (ID: ${reservation.user._id})</li>
        <li><strong>Période :</strong> Du ${new Date(reservation.startDate).toLocaleDateString()} au ${new Date(reservation.endDate).toLocaleDateString()}</li>
        <li><strong>Statut :</strong> Annulée</li>
        <li><strong>Annulé par :</strong> ${userRole === 'admin' ? 'Admin' : 'Utilisateur'} (${req.user.email})</li>
      </ul>
    `;

    await sendEmail({
      email: reservation.user.email,
      subject: 'Annulation de votre réservation Vroum-Auto',
      html: cancellationHtmlUser
    });

    await sendEmail({
      email: process.env.EMAIL_ADMIN_RECIPIENT || process.env.EMAIL_USER, // Envoyer à l'admin
      subject: `[Annulation Réservation] ${reservation.vehicle.name} par ${reservation.user.email}`,
      html: notificationHtmlAdmin
    });

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    console.error('Erreur lors de l\'annulation de la réservation:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'ID de réservation invalide.' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de l\'annulation de la réservation.' });
  }
};

// @desc    Obtenir les réservations pour un utilisateur (ou toutes pour admin)
// @route   GET /api/reservations/my
// @access  Private (Utilisateur)
export const getMyReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const specificUserId = req.query.user; // Si un admin regarde les résa d'un user spécifique

    let query = {};
    if (userRole === 'user') {
      query.user = userId;
    } else if (userRole === 'admin' && specificUserId) {
      query.user = specificUserId; // L'admin demande les réservations de cet utilisateur
    }
    // Si admin et pas de specificUserId, la query reste vide pour obtenir toutes les réservations

    const reservations = await Reservation.find(query)
      .populate({
        path: 'vehicle',
        select: 'name brand model year images coverImageIndex type dailyRate price' // Sélectionne les champs nécessaires
      })
      .populate('user', 'email') // Popule juste l'email de l'utilisateur
      .sort({ createdAt: -1 }); // Trie par les plus récentes

    res.status(200).json({ success: true, count: reservations.length, data: reservations });
  } catch (err) {
    console.error('Erreur lors de la récupération des réservations:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des réservations.' });
  }
};

// @desc    Mettre à jour le statut d'une réservation (Admin seulement)
// @route   PUT /api/reservations/:id/status
// @access  Private/Admin
export const updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Nouveau statut (e.g., 'confirmed', 'completed')

  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, msg: 'Statut de réservation invalide.' });
  }

  try {
    const reservation = await Reservation.findById(id).populate('vehicle').populate('user');
    if (!reservation) {
      return res.status(404).json({ success: false, msg: 'Réservation non trouvée.' });
    }

    const oldStatus = reservation.status;
    reservation.status = status;
    await reservation.save();

    // Envoyer un email de notification à l'utilisateur si le statut change
    if (oldStatus !== status) {
      let subject = '';
      let htmlContent = '';

      if (status === 'confirmed') {
        subject = `Votre réservation pour ${reservation.vehicle.name} est confirmée !`;
        htmlContent = `
          <p>Bonjour ${reservation.user.email},</p>
          <p>Nous avons le plaisir de vous confirmer votre réservation pour le véhicule <strong>${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.year})</strong>.</p>
          <p>Détails confirmés :</p>
          <ul>
            <li><strong>Véhicule :</strong> ${reservation.vehicle.name}</li>
            <li><strong>Période :</strong> Du ${new Date(reservation.startDate).toLocaleDateString()} au ${new Date(reservation.endDate).toLocaleDateString()}</li>
            <li><strong>Statut :</strong> Confirmée</li>
          </ul>
          <p>Veuillez vous présenter à notre agence à la date de début avec les documents nécessaires.</p>
          <p>L'équipe Vroum-Auto</p>
        `;
      } else if (status === 'cancelled') {
        subject = `Votre réservation pour ${reservation.vehicle.name} a été annulée.`;
        htmlContent = `
          <p>Bonjour ${reservation.user.email},</p>
          <p>Votre réservation pour le véhicule <strong>${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.year})</strong> a été annulée par l'administration.</p>
          <p>Détails :</p>
          <ul>
            <li><strong>Véhicule :</strong> ${reservation.vehicle.name}</li>
            <li><strong>Période :</strong> Du ${new Date(reservation.startDate).toLocaleDateString()} au ${new Date(reservation.endDate).toLocaleDateString()}</li>
            <li><strong>Statut :</strong> Annulée par l'administration</li>
          </ul>
          <p>N'hésitez pas à nous contacter pour toute question ou pour effectuer une nouvelle réservation.</p>
          <p>L'équipe Vroum-Auto</p>
        `;
      } else if (status === 'completed') {
        subject = `Votre réservation pour ${reservation.vehicle.name} est terminée.`;
        htmlContent = `
          <p>Bonjour ${reservation.user.email},</p>
          <p>Nous confirmons que votre réservation pour le véhicule <strong>${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.year})</strong> est désormais terminée.</p>
          <p>Nous espérons que vous avez apprécié votre expérience avec Vroum-Auto.</p>
          <p>N'hésitez pas à revenir vers nous pour vos futurs besoins en véhicules.</p>
          <p>L'équipe Vroum-Auto</p>
        `;
      }

      await sendEmail({
        email: reservation.user.email,
        subject: subject,
        html: htmlContent
      });
    }

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du statut de réservation:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'ID de réservation invalide.' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la mise à jour du statut de réservation.' });
  }
};

// @desc    Obtenir les statistiques de réservation par statut
// @route   GET /api/reservations/stats/status
// @access  Private/Admin
export const getReservationStatusStats = async (req, res) => {
  try {
    const stats = await Reservation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$count"
        }
      }
    ]);

    // Assurez-vous que tous les statuts sont présents, même avec un count de 0
    const defaultStats = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    };

    stats.forEach(item => {
      defaultStats[item.name] = item.value;
    });

    res.status(200).json({ success: true, data: defaultStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des statistiques de réservation.' });
  }
};
