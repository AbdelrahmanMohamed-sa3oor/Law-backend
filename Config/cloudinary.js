import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// تكوين Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// اختبار الاتصال
cloudinary.api.ping()
  .then(result => console.log('✅ Cloudinary connected successfully'))
  .catch(err => console.error('❌ Cloudinary connection failed:', err));

export { cloudinary };