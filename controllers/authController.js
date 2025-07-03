// backend/controllers/authController.js

import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js'; 

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: 'L\'utilisateur existe déjà avec cet email' });
    }

    user = new User({
      email,
      password,
      favorites: [] // Initialise les favoris pour un nouvel utilisateur
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    // Optionnel: Envoyer un email de bienvenue après l'inscription
    const welcomeHtml = `
      <p>Bonjour ${email},</p>
      <p>Bienvenue sur Vroum-Auto ! Votre compte a été créé avec succès.</p>
      <p>Commencez à explorer notre sélection de véhicules à vendre et à louer dès maintenant.</p>
      <p><a href="${process.env.FRONTEND_URL}/auth" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Se connecter</a></p>
      <p>L'équipe Vroum-Auto</p>
    `;
    try {
      await sendEmail({
        email: user.email,
        subject: 'Bienvenue sur Vroum-Auto !',
        html: welcomeHtml
      });
    } catch (emailErr) {
      console.error(`Échec de l'envoi de l'email de bienvenue à ${user.email}:`, emailErr.message);
      // Ne pas bloquer l'inscription si l'email ne peut pas être envoyé
    }


    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        favorites: user.favorites // Assurez-vous d'inclure les favoris
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
};

// @desc    Connecter un utilisateur
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Populate favorites directly on login to ensure they are available
    const user = await User.findOne({ email }).select('+password').populate('favorites');

    if (!user) {
      return res.status(400).json({ msg: 'Identifiants invalides' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Identifiants invalides' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        favorites: user.favorites.map(fav => fav.toString()) // Envoyer les IDs favoris
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
};

// @desc    Demander la réinitialisation du mot de passe
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
   
    if (!user) {
      // Pour des raisons de sécurité, toujours renvoyer un succès même si l'email n'existe pas
      return res.status(200).json({ success: true, msg: 'Si votre adresse email est enregistrée, un lien de réinitialisation a été envoyé.' });
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false }); // Sauvegarder le token et son expiration

    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

    const message = `Vous recevez cet email car vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte.\n\n` +
                    `Veuillez cliquer sur ce lien pour réinitialiser votre mot de passe : \n\n${resetUrl}\n\n` +
                    `Ce lien expirera dans 10 minutes.\n\n` +
                    `Si vous n'avez pas demandé cela, veuillez ignorer cet email et votre mot de passe restera inchangé.`;
    
    const htmlMessage = `
      <p>Bonjour,</p>
      <p>Vous recevez cet email car vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte Vroum-Auto.</p>
      <p>Veuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expirera dans 10 minutes.</p>
      <p>Si vous n'avez pas demandé cela, veuillez ignorer cet email et votre mot de passe restera inchangé.</p>
      <p>L'équipe Vroum-Auto</p>
    `;

    try {
      
      await sendEmail({
        email: user.email,
        subject: 'Réinitialisation de mot de passe Vroum-Auto',
        message: message, // Version texte
        html: htmlMessage // Version HTML
      });

      res.status(200).json({ success: true, msg: 'Email de réinitialisation envoyé' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false }); // Réinitialiser le token si l'envoi échoue

      console.error('Erreur lors de la demande de réinitialisation du mot de passe (sendEmail):', err);
      res.status(500).json({ success: false, error: 'L\'email n\'a pas pu être envoyé' });
    }

  } catch (err) {
    console.error('Erreur générale dans forgotPassword:', err.message);
    res.status(500).send('Erreur du serveur');
  }
};

// @desc    Réinitialiser le mot de passe avec un token
// @route   PUT /api/auth/resetpassword/:resetToken
// @access  Public
export const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // Token non expiré
    });

    if (!user) {
      return res.status(400).json({ success: false, msg: 'Token de réinitialisation invalide ou expiré.' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save(); // Le middleware pre-save hachera le nouveau mot de passe

    res.status(200).json({ success: true, msg: 'Mot de passe réinitialisé avec succès.' });

  } catch (err) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', err.message);
    res.status(500).json({ success: false, msg: 'Erreur serveur lors de la réinitialisation du mot de passe.' });
  }
};

// @desc    Obtenir les informations de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    // IMPORTANT: Populez les favoris ici pour que le frontend les reçoive
    const user = await User.findById(req.user.id).select('-password').populate('favorites');

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Utilisateur non trouvé' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role ? user.role.trim() : 'user',
        favorites: user.favorites.map(fav => fav.toString()) // Assurez-vous d'envoyer les IDs des favoris
      }
    });
  } catch (err) {
    console.error('Erreur dans getMe:', err);
    res.status(500).json({ success: false, msg: 'Erreur serveur lors de la récupération des informations utilisateur' });
  }
};

// @desc    Gérer l'envoi de message de contact
// @route   POST /api/auth/contact
// @access  Public
export const contactUs = async (req, res) => {
  const { name, email, subject, message } = req.body;
 
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, msg: 'Veuillez remplir tous les champs obligatoires.' });
  }

  try {
    // Corps HTML de l'e-mail pour l'administrateur
    const adminEmailHtml = `
      <p>Nouveau message de contact de Vroum-Auto :</p>
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Sujet :</strong> ${subject}</p>
      <p><strong>Message :</strong></p>
      <p>${message}</p>
      <p>---</p>
      <p>Ceci est un email automatique, veuillez ne pas y répondre directement.</p>
    `;
  
    await sendEmail({
      email: process.env.EMAIL_ADMIN_RECIPIENT || process.env.EMAIL_USER, // Envoyer à l'admin configuré
      subject: `[Vroum-Auto Contact] ${subject}`,
      html: adminEmailHtml,
    });
    

    res.status(200).json({ success: true, msg: 'Votre message a été envoyé avec succès !' });

  } catch (err) {
    console.error('Erreur lors de l\'envoi du message de contact:', err);
    res.status(500).json({ success: false, error: 'Échec de l\'envoi du message.' });
  }
};
