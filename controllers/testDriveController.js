// backend/controllers/testDriveController.js

import TestDrive from '../models/TestDrive.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';

// @desc    Créer une nouvelle demande d'essai
// @route   POST /api/testdrives
// @access  Private (Utilisateur)
export const createTestDrive = async (req, res) => {
  const { vehicle: vehicleId, testDriveDate, message } = req.body;
  const userId = req.user.id; // ID de l'utilisateur authentifié

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé.' });
    }

    const testDrive = await TestDrive.create({
      vehicle: vehicleId,
      user: userId,
      testDriveDate,
      message,
      status: 'pending' // La demande est en attente
    });

    // Envoyer un email de confirmation à l'utilisateur
    const confirmationHtmlUser = `
      <p>Bonjour ${user.email},</p>
      <p>Nous avons bien reçu votre demande d'essai pour le véhicule <strong>${vehicle.brand} ${vehicle.model} (${vehicle.year})</strong>.</p>
      <p>Détails de votre demande :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${vehicle.name}</li>
        <li><strong>Date d'essai souhaitée :</strong> ${new Date(testDriveDate).toLocaleDateString()} à ${new Date(testDriveDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Statut :</strong> En attente de confirmation</li>
      </ul>
      <p>Nous allons examiner votre demande et vous recontacterons très prochainement pour confirmer la date et l'heure de l'essai.</p>
      <p>L'équipe Vroum-Auto</p>
    `;

    // Envoyer un email de notification à l'administrateur
    const notificationHtmlAdmin = `
      <p>Nouvelle demande d'essai reçue :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${vehicle.name} (ID: ${vehicleId})</li>
        <li><strong>Utilisateur :</strong> ${user.email} (ID: ${userId})</li>
        <li><strong>Date souhaitée :</strong> ${new Date(testDriveDate).toLocaleDateString()} à ${new Date(testDriveDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Message :</strong> ${message || 'Aucun message.'}</li>
      </ul>
      <p>Veuillez confirmer ou annuler cette demande via le tableau de bord administrateur.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Confirmation de votre demande d\'essai Vroum-Auto',
      html: confirmationHtmlUser
    });

    await sendEmail({
      email: process.env.EMAIL_ADMIN_RECIPIENT || process.env.EMAIL_USER, // Envoyer à l'admin
      subject: `[Nouvelle Demande d'Essai] ${vehicle.name} par ${user.email}`,
      html: notificationHtmlAdmin
    });

    res.status(201).json({ success: true, data: testDrive });
  } catch (err) {
    console.error('Erreur lors de la création de la demande d\'essai:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création de la demande d\'essai.' });
  }
};

// @desc    Annuler une demande d'essai
// @route   PUT /api/testdrives/:id/cancel
// @access  Private (Utilisateur ou Admin)
export const cancelTestDrive = async (req, res) => {
  const { id } = req.params; // ID de la demande d'essai
  const userId = req.user.id; // ID de l'utilisateur authentifié
  const userRole = req.user.role; // Rôle de l'utilisateur authentifié

  try {
    const testDrive = await TestDrive.findById(id).populate('vehicle').populate('user');
    if (!testDrive) {
      return res.status(404).json({ success: false, msg: 'Demande d\'essai non trouvée.' });
    }

    // Autorisation: Seul l'utilisateur qui a fait la demande ou un admin peut annuler
    if (testDrive.user._id.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, msg: 'Non autorisé à annuler cette demande d\'essai.' });
    }

    if (testDrive.status === 'cancelled' || testDrive.status === 'completed') {
      return res.status(400).json({ success: false, msg: 'Cette demande d\'essai a déjà été annulée ou complétée.' });
    }

    testDrive.status = 'cancelled';
    await testDrive.save();

    // Envoyer un email de confirmation d'annulation à l'utilisateur
    const cancellationHtmlUser = `
      <p>Bonjour ${testDrive.user.email},</p>
      <p>Votre demande d'essai pour le véhicule <strong>${testDrive.vehicle.brand} ${testDrive.vehicle.model} (${testDrive.vehicle.year})</strong> a été annulée avec succès.</p>
      <p>Détails de la demande d'essai annulée :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${testDrive.vehicle.name}</li>
        <li><strong>Date d'essai :</strong> ${new Date(testDrive.testDriveDate).toLocaleDateString()} à ${new Date(testDrive.testDriveDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Statut :</strong> Annulée</li>
      </ul>
      <p>Si vous avez annulé par erreur ou si vous avez des questions, veuillez nous contacter.</p>
      <p>L'équipe Vroum-Auto</p>
    `;

    // Envoyer un email de notification à l'administrateur
    const notificationHtmlAdmin = `
      <p>Une demande d'essai a été annulée :</p>
      <ul>
        <li><strong>Véhicule :</strong> ${testDrive.vehicle.name} (ID: ${testDrive.vehicle._id})</li>
        <li><strong>Utilisateur :</strong> ${testDrive.user.email} (ID: ${testDrive.user._id})</li>
        <li><strong>Date d'essai :</strong> ${new Date(testDrive.testDriveDate).toLocaleDateString()} à ${new Date(testDrive.testDriveDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Statut :</strong> Annulée</li>
        <li><strong>Annulé par :</strong> ${userRole === 'admin' ? 'Admin' : 'Utilisateur'} (${req.user.email})</li>
      </ul>
    `;

    await sendEmail({
      email: testDrive.user.email,
      subject: 'Annulation de votre demande d\'essai Vroum-Auto',
      html: cancellationHtmlUser
    });

    await sendEmail({
      email: process.env.EMAIL_ADMIN_RECIPIENT || process.env.EMAIL_USER, // Envoyer à l'admin
      subject: `[Annulation Demande d'Essai] ${testDrive.vehicle.name} par ${testDrive.user.email}`,
      html: notificationHtmlAdmin
    });

    res.status(200).json({ success: true, data: testDrive });
  } catch (err) {
    console.error('Erreur lors de l\'annulation de la demande d\'essai:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'ID de demande d\'essai invalide.' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de l\'annulation de la demande d\'essai.' });
  }
};

// @desc    Obtenir les demandes d'essai pour un utilisateur (ou toutes pour admin)
// @route   GET /api/testdrives/my
// @access  Private (Utilisateur)
export const getMyTestDrives = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const specificUserId = req.query.user; // Si un admin regarde les essais d'un user spécifique

    let query = {};
    if (userRole === 'user') {
      query.user = userId;
    } else if (userRole === 'admin' && specificUserId) {
      query.user = specificUserId; // L'admin demande les essais de cet utilisateur
    }
    // Si admin et pas de specificUserId, la query reste vide pour obtenir toutes les demandes

    const testDrives = await TestDrive.find(query)
      .populate({
        path: 'vehicle',
        select: 'name brand model year images coverImageIndex type dailyRate price'
      })
      .populate('user', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: testDrives.length, data: testDrives });
  } catch (err) {
    console.error('Erreur lors de la récupération des demandes d\'essai:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des demandes d\'essai.' });
  }
};

// @desc    Mettre à jour le statut d'une demande d'essai (Admin seulement)
// @route   PUT /api/testdrives/:id/status
// @access  Private/Admin
export const updateTestDriveStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Nouveau statut

  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, msg: 'Statut de demande d\'essai invalide.' });
  }

  try {
    const testDrive = await TestDrive.findById(id).populate('vehicle').populate('user');
    if (!testDrive) {
      return res.status(404).json({ success: false, msg: 'Demande d\'essai non trouvée.' });
    }

    const oldStatus = testDrive.status;
    testDrive.status = status;
    await testDrive.save();

    // Envoyer un email de notification à l'utilisateur si le statut change
    if (oldStatus !== status) {
      let subject = '';
      let htmlContent = '';

      if (status === 'confirmed') {
        subject = `Votre demande d'essai pour ${testDrive.vehicle.name} est confirmée !`;
        htmlContent = `
          <p>Bonjour ${testDrive.user.email},</p>
          <p>Nous avons le plaisir de vous confirmer votre demande d'essai pour le véhicule <strong>${testDrive.vehicle.brand} ${testDrive.vehicle.model} (${testDrive.vehicle.year})</strong>.</p>
          <p>Détails confirmés :</p>
          <ul>
            <li><strong>Véhicule :</strong> ${testDrive.vehicle.name}</li>
            <li><strong>Date d'essai :</strong> ${new Date(testDrive.testDriveDate).toLocaleDateString()} à ${new Date(testDrive.testDriveDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
            <li><strong>Statut :</strong> Confirmée</li>
          </ul>
          <p>Veuillez vous présenter à notre agence à la date et heure convenues pour votre essai.</p>
          <p>L'équipe Vroum-Auto</p>
        `;
      } else if (status === 'cancelled') {
        subject = `Votre demande d'essai pour ${testDrive.vehicle.name} a été annulée.`;
        htmlContent = `
          <p>Bonjour ${testDrive.user.email},</p>
          <p>Votre demande d'essai pour le véhicule <strong>${testDrive.vehicle.brand} ${testDrive.vehicle.model} (${testDrive.vehicle.year})</strong> a été annulée par l'administration.</p>
          <p>Détails :</p>
          <ul>
            <li><strong>Véhicule :</strong> ${testDrive.vehicle.name}</li>
            <li><strong>Date d'essai :</strong> ${new Date(testDrive.testDriveDate).toLocaleDateString()} à ${new Date(testDrive.testDriveDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
            <li><strong>Statut :</strong> Annulée par l'administration</li>
          </ul>
          <p>N'hésitez pas à nous contacter pour toute question ou pour planifier un nouvel essai.</p>
          <p>L'équipe Vroum-Auto</p>
        `;
      } else if (status === 'completed') {
        subject = `Votre essai pour ${testDrive.vehicle.name} est terminé.`;
        htmlContent = `
          <p>Bonjour ${testDrive.user.email},</p>
          <p>Nous confirmons que votre essai pour le véhicule <strong>${testDrive.vehicle.brand} ${testDrive.vehicle.model} (${testDrive.vehicle.year})</strong> est désormais terminé.</p>
          <p>Nous espérons que vous avez apprécié votre expérience.</p>
          <p>N'hésitez pas à revenir vers nous pour vos futurs besoins en véhicules.</p>
          <p>L'équipe Vroum-Auto</p>
        `;
      }

      await sendEmail({
        email: testDrive.user.email,
        subject: subject,
        html: htmlContent
      });
    }

    res.status(200).json({ success: true, data: testDrive });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du statut de demande d\'essai:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'ID de demande d\'essai invalide.' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la mise à jour du statut de demande d\'essai.' });
  }
};

// @desc    Obtenir les statistiques de demandes d'essai par statut
// @route   GET /api/testdrives/stats/status
// @access  Private/Admin
export const getTestDriveStatusStats = async (req, res) => {
  try {
    const stats = await TestDrive.aggregate([
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
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des statistiques de demandes d\'essai.' });
  }
};
