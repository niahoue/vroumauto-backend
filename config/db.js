// backend/config/db.js

import { connect } from 'mongoose';

// Fonction pour se connecter à la base de données MongoDB
const connectDB = async () => {
  try {
    // Tente de se connecter à MongoDB en utilisant l'URI définie dans les variables d'environnement
    const conn = await connect(process.env.MONGO_URI,);

    console.log(`MongoDB Connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB: ${error.message}`);
    // Quitter le processus en cas d'échec de connexion
    process.exit(1);
  }
};

export default connectDB; // Exporter la fonction pour l'utiliser dans server.js
