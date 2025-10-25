// createFirstAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// إعداد __dirname لـ ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحميل .env من المسار المطلق
dotenv.config({ path: path.join(__dirname, '.env') });

// تعريف الـ Schema مباشرة هنا بدل الاستيراد
const lawyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  registrationLevel: {
    type: String,
    enum: [
      "تحت التدريب",
      "جدول عام",
      "ابتدائي", 
      "استئناف عالي ومجلس دولة",
      "نقض"
    ],
    required: true
  },
  nationalId: { type: String, required: true },
  startDate: { type: Date, required: true },
  address: { type: String, required: true },
  image: { type: String },
  registrationCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "subadmin", "lawyer"],
    default: "lawyer"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// توليد كود تلقائي
lawyerSchema.pre("validate", function (next) {
  if (!this.registrationCode) {
    this.registrationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

const Lawyer = mongoose.model("Lawyer", lawyerSchema);

const createFirstAdmin = async () => {
  try {
    console.log('🔗 محاولة الاتصال بـ MongoDB...');
    console.log('📡 URI:', process.env.MONGO_URI);
    
    if (!process.env.MONGO_URI) {
      throw new Error('❌ MONGODB_URI not found in .env file');
    }
    
    // تأكد أن الـ URI string
    const mongoURI = String(process.env.MONGO_URI);
    console.log('🔗 Connecting to:', mongoURI);
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ Connected to MongoDB successfully');
    console.log('📊 Database:', mongoose.connection.db?.databaseName);

    // تحقق إذا كان فيه أدمن موجود بالفعل
    const adminExists = await Lawyer.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('\n⚠️  الأدمن موجود بالفعل');
      console.log('📧 كود التسجيل:', adminExists.registrationCode);
      console.log('👤 الاسم:', adminExists.name);
      console.log('🎯 الدور:', adminExists.role);
      
      // عرض عدد المستخدمين
      const userCount = await Lawyer.countDocuments();
      console.log('👥 عدد المستخدمين:', userCount);
      
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('\n🆕 إنشاء الأدمن الأول...');
    
    // إنشاء الأدمن الأول
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminData = {
      name: 'يوسف صاعور',
      registrationNumber: '000000',
      registrationLevel: 'نقض',
      nationalId: '00000000000000',
      startDate: new Date(),
      address: 'AlDhafriya-Central side',
      registrationCode: '000000',
      password: hashedPassword,
      role: 'admin'
    };

    console.log('📝 بيانات الأدمن:', adminData);
    
    const admin = await Lawyer.create(adminData);

    console.log('\n✅ تم إنشاء الأدمن الرئيسي بنجاح!');
    console.log('📧 كود التسجيل: 000000',adminData.registrationNumber);
    console.log('🔐 كلمة المرور: admin123',adminData.password);
    console.log('👤 الدور: admin');
    console.log('🆔 الـ ID:', admin._id);

    // تأكيد الحفظ بالبحث عنه مرة ثانية
    const savedAdmin = await Lawyer.findById(admin._id);
    console.log('✅ تم التأكد من الحفظ:', savedAdmin ? 'نعم' : 'لا');

    await mongoose.connection.close();
    console.log('🔌 تم إغلاق الاتصال');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ في إنشاء الأدمن:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

// تشغيل الدالة
createFirstAdmin();