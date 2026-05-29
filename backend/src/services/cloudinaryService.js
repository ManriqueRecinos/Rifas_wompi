const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube un buffer (PDF o imagen) a Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder  - Carpeta destino en Cloudinary
 * @param {string} publicId
 * @returns {string} URL segura del recurso subido
 */
async function uploadBuffer(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    // Para subir documentos como PDF sin que Cloudinary de error por formato de imagen,
    // usamos resource_type: 'raw' pero nos aseguramos de que el publicId termine en '.pdf'.
    // Esto hace que la URL generada termine en '.pdf' y el navegador lo reconozca inmediatamente.
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder, 
        public_id: publicId.endsWith('.pdf') ? publicId : `${publicId}.pdf`, 
        resource_type: 'raw' 
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/**
 * Sube una imagen (archivo local o URL) a Cloudinary.
 */
async function uploadImage(filePath, folder) {
  const result = await cloudinary.uploader.upload(filePath, { folder });
  return result.secure_url;
}

module.exports = { uploadBuffer, uploadImage };
