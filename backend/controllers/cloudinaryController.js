const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con tus credenciales
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const getSignature = (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Incluimos source: 'uw' para que coincida con el Cloudinary Upload Widget
  const signature = cloudinary.utils.api_sign_request(
    { 
      timestamp: timestamp, 
      upload_preset: 'ml_default',
      source: 'uw' 
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY
  });
};

module.exports = { getSignature };
