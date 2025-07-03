// backend/utils/emailService.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; // Importez dotenv ici aussi pour s'assurer que les variables sont chargées
dotenv.config();

// Vérification de la configuration Nodemailer au chargement du module
// Configuration du transporter Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_PORT === '465', // true for 465 (SSL), false for other ports (like 587 with STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Activez ces options pour le débogage si vous rencontrez des problèmes d'envoi d'e-mails
  logger: process.env.NODE_ENV === 'development',
  debug: process.env.NODE_ENV === 'development',
});

// Fonction utilitaire pour envoyer un e-mail
export const sendEmail = async (options) => {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'Vroum-Auto'} <${process.env.EMAIL_FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Supporte le HTML
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé:', info.messageId);
    if (info.response) {
      console.log('Réponse du serveur SMTP:', info.response);
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Échec de l\'envoi de l\'email:', error.message);
    if (error.response) {
      console.error('Réponse SMTP détaillée:', error.response);
    }
    if (error.code === 'EENVELOPE') {
      console.error('Erreur d\'enveloppe SMTP (problème d\'adresse email):', error.message);
    }
    throw new Error(`L'email n'a pas pu être envoyé: ${error.message}`);
  }
};
