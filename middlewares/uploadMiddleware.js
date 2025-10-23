import multer from 'multer';

// إعداد multer للذاكرة المؤقتة
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 7 * 1024 * 1024, // 5MB حد أقصى
  },
  fileFilter: (req, file, cb) => {
    // قبول الصور فقط
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يُسمح برفع الصور فقط! يرجى رفع ملفات الصور فقط.'), false);
    }
  }
});