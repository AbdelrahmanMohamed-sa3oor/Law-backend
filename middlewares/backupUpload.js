// middlewares/backupUpload.js
import multer from 'multer';

const storage = multer.memoryStorage();

const backupUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 ملف وارد:', file.originalname, file.mimetype);
    
    if (file.mimetype === 'application/json' || 
        file.originalname.toLowerCase().endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('يسمح فقط بملفات JSON للنسخ الاحتياطية'), false);
    }
  }
});

// middleware للتحقق من الملف
const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '❌ لم يتم اختيار ملف'
    });
  }

  console.log('✅ ملف مستلم:', {
    name: req.file.originalname,
    size: req.file.size,
    buffer: req.file.buffer ? `موجود (${req.file.buffer.length} bytes)` : 'غير موجود',
    mimetype: req.file.mimetype
  });

  // تحقق من أن buffer موجود
  if (!req.file.buffer) {
    return res.status(400).json({
      success: false,
      message: '❌ خطأ في تحميل الملف'
    });
  }

  next();
};

export { backupUpload, validateFile };