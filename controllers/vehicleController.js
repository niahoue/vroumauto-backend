// backend/controllers/vehicleController.js

import Vehicle from '../models/Vehicle.js';
import cloudinary from 'cloudinary'; // Assurez-vous que Cloudinary est importé

// @desc    Obtenir tous les véhicules (avec filtres et pagination)
// @route   GET /api/vehicles
// @access  Public
export const getVehicles = async (req, res) => {
  
  try {
    const query = { ...req.query };
    
    // Champs à exclure pour le filtrage côté logique de requête, pas pour Mongoose directement
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete query[param]);
    
    let queryStr = JSON.stringify(query);
    // Remplacer les opérateurs de comparaison (gt, gte, lt, lte, in) par $gt, $gte, etc.
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    let parsedQuery = JSON.parse(queryStr);

    // --- LOGIQUE DE CONVERSION DE TYPE AMÉLIORÉE ET EXPLICITE ---
    for (const key in parsedQuery) {
      if (parsedQuery.hasOwnProperty(key)) {
        const value = parsedQuery[key];

        // Gérer la conversion des booléens
        if (key === 'isFeatured') {
          if (value === 'true') {
            parsedQuery[key] = true;
          } else if (value === 'false') {
            parsedQuery[key] = false;
          } else {
            // Supprimer le filtre si la valeur n'est ni 'true' ni 'false'
            // Cela pourrait laisser un isFeatured: undefined, qui ne filtrera rien
            // Ou si vous voulez ignorer le paramètre si invalide:
            delete parsedQuery[key];
          }
        }
        // Gérer la conversion des nombres (pour les opérateurs de plage et les valeurs directes)
        // Les champs comme 'price', 'mileage', 'year', 'dailyRate', 'passengers'
        else if (['price', 'mileage', 'year', 'dailyRate', 'passengers'].includes(key)) {
          if (typeof value === 'object' && value !== null) {
            // Si c'est un objet (ex: { $gte: "1000" }), parcourir ses propriétés
            for (const op in value) {
              if (!isNaN(parseFloat(value[op]))) {
                value[op] = parseFloat(value[op]);
              } else {
                // Supprimer l'opérateur si la valeur n'est pas un nombre valide
                delete value[op];
              }
            }
          } else if (!isNaN(parseFloat(value))) {
            // Si c'est une valeur directe (ex: "1000"), la convertir en nombre
            parsedQuery[key] = parseFloat(value);
          } else {
            // Supprimer le filtre si la valeur n'est pas un nombre valide
            delete parsedQuery[key];
          }
        }
        // Les autres champs comme 'type', 'brand', 'model', 'fuel' restent des chaînes de caractères
      }
    }
  
    let vehiclesQuery = Vehicle.find(parsedQuery);

    // Sélection des champs (ex: ?select=name,price)
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      vehiclesQuery = vehiclesQuery.select(fields);
    }

    // Tri (ex: ?sort=price,-createdAt)
    // IMPORTANT: MongoDB nécessite des index pour le tri sur de grands jeux de données sans erreurs de performance.
    // Pour l'instant, c'est OK, mais à l'échelle, des index pourraient être nécessaires.
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      vehiclesQuery = vehiclesQuery.sort(sortBy);
    } else {
      vehiclesQuery = vehiclesQuery.sort('-createdAt'); // Tri par défaut
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Vehicle.countDocuments(parsedQuery); // Utilise parsedQuery pour le count

    vehiclesQuery = vehiclesQuery.skip(startIndex).limit(limit);

    const vehicles = await vehiclesQuery;

    // Résultat de pagination
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: vehicles.length,
      total,
      pagination,
      data: vehicles
    });
  } catch (err) {
    console.error("Erreur dans getVehicles:", err); // Log plus spécifique
    // Envoyer une réponse d'erreur formatée en JSON en cas d'erreur
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des véhicules.' });
  }
};


// @desc    Obtenir un seul véhicule
// @route   GET /api/vehicles/:id
// @access  Public
export const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (err) {
    console.error("Erreur dans getVehicle:", err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération du véhicule' });
  }
};

// @desc    Créer un nouveau véhicule
// @route   POST /api/vehicles
// @access  Private/Admin
export const createVehicle = async (req, res) => {
  try {
    const uploadedImageUrls = [];
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      for (const base64Image of req.body.images) {
        if (base64Image.startsWith('data:image')) {
          const result = await cloudinary.v2.uploader.upload(base64Image, {
            folder: process.env.CLOUDINARY_FOLDER_NAME || 'Vroum-Auto-vehicles',
            transformation: [
              { width: 1200, height: 900, crop: "limit" },
              { quality: "auto:low" }
            ]
          });
          uploadedImageUrls.push(result.secure_url);
        } else {
          uploadedImageUrls.push(base64Image);
        }
      }
      req.body.images = uploadedImageUrls;
    } else {
      req.body.images = ['https://placehold.co/600x400/E0E7FF/3730A3?text=Image+non+disponible'];
    }

    req.body.user = req.user.id;

    const vehicle = await Vehicle.create(req.body);

    res.status(201).json({
      success: true,
      data: vehicle
    });
  } catch (err) {
    console.error("Erreur dans createVehicle:", err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création du véhicule' });
  }
};

// @desc    Mettre à jour un véhicule
// @route   PUT /api/vehicles/:id
// @access  Private/Admin
export const updateVehicle = async (req, res) => {
  try {
    let vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé' });
    }

    const updatedImageUrls = [];
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      for (const img of req.body.images) {
        if (img.startsWith('data:image')) {
          const result = await cloudinary.v2.uploader.upload(img, {
            folder: process.env.CLOUDINARY_FOLDER_NAME || 'Vroum-Auto-vehicles',
            transformation: [
              { width: 1200, height: 900, crop: "limit" },
              { quality: "auto:low" }
            ]
          });
          updatedImageUrls.push(result.secure_url);
        } else {
          updatedImageUrls.push(img);
        }
      }
      req.body.images = updatedImageUrls;
    } else {
      req.body.images = ['https://placehold.co/600x400/E0E7FF/3730A3?text=Image+non+disponible'];
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: vehicle });
  } catch (err) {
    console.error("Erreur dans updateVehicle:", err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la mise à jour du véhicule' });
  }
};

// @desc    Supprimer un véhicule
// @route   DELETE /api/vehicles/:id
// @access  Private/Admin
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, msg: 'Véhicule non trouvé' });
    }

    await vehicle.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error("Erreur dans deleteVehicle:", err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la suppression du véhicule' });
  }
};

// @desc    Obtenir les statistiques d'ajouts de véhicules par mois
// @route   GET /api/vehicles/stats/additions
// @access  Private/Admin
export const getVehicleAdditionStats = async (req, res) => {
  try {
    const stats = await Vehicle.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      },
      {
        $project: {
          _id: 0,
          monthYear: {
            $concat: [
              { $toString: "$_id.month" },
              "-",
              { $toString: "$_id.year" }
            ]
          },
          count: "$count"
        }
      }
    ]);

    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const formattedStats = stats.map(s => {
      const [monthNum, year] = s.monthYear.split('-');
      return {
        monthYear: `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`,
        count: s.count
      };
    });

    res.status(200).json({ success: true, data: formattedStats });
  } catch (err) {
    console.error("Erreur dans getVehicleAdditionStats:", err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la récupération des statistiques d\'ajout de véhicules' });
  }
};
