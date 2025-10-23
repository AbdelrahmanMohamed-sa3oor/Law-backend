import Lawyer from "../models/Lawyer.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cloudinary } from "../Config/cloudinary.js";
// 🟢 إنشاء محامي/أدمن جديد
export const registerLawyer = async (req, res) => {

  let imageData = null;

  try {
    const {
      name,
      registrationNumber,
      registrationLevel,
      nationalId,
      startDate,
      address,
      password,
      phone,
      role = "lawyer",
      salary
    } = req.body;

    // ✅ استخدام req.file (لـ single upload)
    if (req.file) {

      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'lawyers-profile',
              resource_type: 'image'
            },
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end(req.file.buffer);
        });

        imageData = {
          url: result.secure_url,
          public_id: result.public_id
        };
        
      } catch (uploadError) {
        console.error('❌ Cloudinary upload failed:', uploadError.message);
        // استمر بدون صورة
      }
    } else {
      console.log("ℹ️ No file to upload");
    }

    // باقي عملية التسجيل
    const registrationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    const lawyerData = {
      name,
      registrationNumber,
      registrationLevel,
      nationalId,
      startDate: new Date(startDate),
      address,
      registrationCode,
      password: hashedPassword,
      role,
      phone,
      salary
    };

    if (imageData) {
      lawyerData.image = imageData;
    }


    const lawyer = await Lawyer.create(lawyerData);

    console.log("✅ Lawyer created successfully");
    res.status(201).json({
      success: true,
      message: `✅ تم تسجيل ${getRoleArabic(role)} بنجاح`,
      registrationCode: lawyer.registrationCode,
      role: lawyer.role,
      image: lawyer.image?.url || null
    });

  } catch (err) {
    console.error(" Register Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
// 🟢 تحديث صورة المستخدم
export const updateLawyerImage = async (req, res) => {
  try {
    const lawyerId = req.params.id;
    
    // التحقق من الصلاحيات
    if (req.user.id !== lawyerId && !["admin", "subadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "❌ غير مسموح بتحديث هذه الصورة" });
    }

    const lawyer = await Lawyer.findById(lawyerId);
    if (!lawyer) {
      return res.status(404).json({ message: "⚠️ المستخدم غير موجود" });
    }

    // ✅ رفع الصورة الجديدة إلى Cloudinary
    let newImageData = null;
    if (req.files && req.files.length > 0) {
      console.log("🔼 Uploading new image to Cloudinary...");
      
      const file = req.files[0];
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'lawyers-profile',
            resource_type: 'image',
            transformation: [
              { width: 300, height: 300, crop: "fill" },
              { quality: "auto" },
              { format: "jpg" }
            ]
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        uploadStream.end(file.buffer);
      });

      newImageData = {
        url: result.secure_url,
        public_id: result.public_id
      };

      // 🗑️ حذف الصورة القديمة من Cloudinary إذا كانت موجودة
      if (lawyer.image && lawyer.image.public_id) {
        try {
          await cloudinary.uploader.destroy(lawyer.image.public_id);
          console.log('✅ Old image deleted from Cloudinary');
        } catch (deleteError) {
          console.error('❌ Error deleting old image:', deleteError);
        }
      }
    }

    // تحديث بيانات المستخدم بالصورة الجديدة
    const updatedLawyer = await Lawyer.findByIdAndUpdate(
      lawyerId,
      { image: newImageData },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: "✅ تم تحديث الصورة بنجاح",
      lawyer: updatedLawyer
    });

  } catch (err) {
    console.error("❌ Update Image Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// 🟢 تسجيل الدخول بالكود لجميع الأدوار
// 🟢 تسجيل الدخول بالكود لجميع الأدوار
export const loginLawyer = async (req, res) => {
  try {
    const { registrationCode, password } = req.body;

    // تحقق من وجود البيانات
    if (!registrationCode || !password) {
      return res.status(400).json({
        success: false,
        message: "كود التسجيل وكلمة المرور مطلوبان"
      });
    }

    // ابحث عن المحامي
    const lawyer = await Lawyer.findOne({ registrationCode });

    if (!lawyer) {
      // اطبع جميع الأكواد الموجودة علشان تتأكد
      const allLawyers = await Lawyer.find({}, 'registrationCode name role');
      
      return res.status(404).json({ 
        success: false,
        message: "⚠️ لا يوجد مستخدم بهذا الكود" 
      });
    }

    // التحقق من الحساب النشط
    if (!lawyer.isActive) {
      return res.status(403).json({ 
        success: false,
        message: " الحساب معطل" 
      });
    }

    const match = await bcrypt.compare(password, lawyer.password);

    if (!match) {
      return res.status(401).json({ 
        success: false,
        message: " كلمة المرور غير صحيحة" 
      });
    }

    const token = jwt.sign(
      { 
        id: lawyer._id, 
        role: lawyer.role,
        registrationCode: lawyer.registrationCode
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: ` تم تسجيل الدخول بنجاح كـ ${getRoleArabic(lawyer.role)}`,
      token,
      user: {
        id: lawyer._id,
        name: lawyer.name,
        registrationCode: lawyer.registrationCode,
        registrationLevel: lawyer.registrationLevel,
        role: lawyer.role
      }
    });
  } catch (err) {
    console.error(" Login Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// 🔹 جلب جميع المستخدمين (مع الفلترة حسب الصلاحيات)
// في lawyersController.js - عدل دالة getAllLawyers
export const getAllLawyers = async (req, res) => {
  try {
    const { name, registrationNumber } = req.query;
    
    let filter = {};
    
    // فلترة حسب الصلاحيات
    if (req.user.role === "subadmin") {
      filter.role = { $ne: "admin" };
    } else if (req.user.role === "lawyer") {
      filter._id = req.user.id;
    }
    
    // إضافة فلترة البحث
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    
    if (registrationNumber) {
      filter.registrationNumber = { $regex: registrationNumber, $options: 'i' };
    }
    
    const lawyers = await Lawyer.find(filter).select('-password').sort({ createdAt: -1 });
    
    res.json(lawyers);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 جلب مستخدم واحد فقط
export const getLawyerById = async (req, res) => {
  try {
    const lawyer = await Lawyer.findById(req.params.id).select('-password');
    if (!lawyer) return res.status(404).json({ message: " المستخدم غير موجود" });

    // التحقق من الصلاحيات
    if (!canViewUser(req.user, lawyer)) {
      return res.status(403).json({ message: " غير مسموح بالوصول" });
    }

    res.json(lawyer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




export const updateLawyer = async (req, res) => {
  try {
    const updates = req.body;
    const lawyerId = req.params.id;

    // التحقق من وجود الموظف
    const targetLawyer = await Lawyer.findById(lawyerId);
    if (!targetLawyer) {
      return res.status(404).json({ message: "⚠️ المستخدم غير موجود" });
    }

    // التحقق من الصلاحيات (إذا كان لديك نظام صلاحيات)
    // if (!canEditUser(req.user, targetLawyer, updates)) {
    //   return res.status(403).json({ message: "❌ غير مسموح بالتعديل" });
    // }

    // إذا كان هناك باسوورد في البيانات المرسلة وغير فارغ
    if (updates.password && updates.password.trim() !== '') {
      if (updates.password.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      // إذا الباسوورد فارغ أو غير موجود، احذفه من التحديثات
      delete updates.password;
    }

    // تحديث البيانات
    const updatedLawyer = await Lawyer.findByIdAndUpdate(
      lawyerId, 
      updates, 
      { 
        new: true, // إرجاع البيانات المحدثة
        runValidators: true // تشغيل الـ validators
      }
    ).select('-password'); // استبعاد الباسوورد من النتيجة

    if (!updatedLawyer) {
      return res.status(404).json({ message: "⚠️ فشل في تحديث البيانات" });
    }

    res.json({
      success: true,
      message: " تم تعديل البيانات بنجاح",
      data: updatedLawyer
    });

  } catch (err) {
    console.error('Update error:', err);
    
    // معالجة أخطاء الـ mongoose
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ 
        message: " خطأ في التحقق من البيانات", 
        errors 
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: " البيانات مكررة (كود التسجيل أو الرقم القومي)" 
      });
    }

    res.status(500).json({ 
      message: " حدث خطأ في الخادم",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
// 🔍 دالة البحث بالاسم ورقم القيد
// في lawyersController.js
export const searchLawyers = async (req, res) => {
  try {
    const { name, registrationNumber } = req.query;
    
    let searchQuery = {};
    
    if (name) {
      searchQuery.name = { $regex: name, $options: 'i' };
    }
    
    if (registrationNumber) {
      searchQuery.registrationNumber = { $regex: registrationNumber, $options: 'i' };
    }
    
    // إضافة فلترة الصلاحيات
    if (req.user.role === "subadmin") {
      searchQuery.role = { $ne: "admin" };
    } else if (req.user.role === "lawyer") {
      searchQuery._id = req.user.id;
    }
    
    const lawyers = await Lawyer.find(searchQuery).select('-password');
    
    res.json({
      success: true,
      data: lawyers
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// 🔹 حذف مستخدم
export const deleteLawyer = async (req, res) => {
  try {
    const lawyerId = req.params.id;

    // التحقق من الصلاحيات
    const targetLawyer = await Lawyer.findById(lawyerId);
    if (!targetLawyer) return res.status(404).json({ message: "⚠️ المستخدم غير موجود" });

    if (!canDeleteUser(req.user, targetLawyer)) {
      return res.status(403).json({ 
        message: " غير مسموح بالحذف" });
    }

    await Lawyer.findByIdAndDelete(lawyerId);
    res.json({ 
        status:true,
      message: "🗑️ تم حذف المستخدم بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 تفعيل/تعطيل مستخدم
export const toggleUserStatus = async (req, res) => {
  try {
    const lawyer = await Lawyer.findById(req.params.id);
    if (!lawyer) return res.status(404).json({ message: "⚠️ المستخدم غير موجود" });

    // فقط الأدمن والسب أدمن يمكنهم تعطيل المستخدمين
    if (!["admin", "subadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "❌ غير مسموح بهذا الإجراء" });
    }

    // لا يمكن تعطيل الأدمن
    if (lawyer.role === "admin" && req.user.role !== "admin") {
      return res.status(403).json({ message: "❌ لا يمكن تعطيل أدمن" });
    }

    lawyer.isActive = !lawyer.isActive;
    await lawyer.save();

    res.json({
      message: `✅ تم ${lawyer.isActive ? 'تفعيل' : 'تعطيل'} المستخدم بنجاح`,
      isActive: lawyer.isActive
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========== الدوال المساعدة ==========

// دالة للحصول على الاسم العربي للدور
function getRoleArabic(role) {
  const roles = {
    admin: "أدمن",
    subadmin: "مساعد أدمن", 
    lawyer: "محامي"
  };
  return roles[role] || "مستخدم";
}

// دالة للتحقق من صلاحية العرض
function canViewUser(currentUser, targetUser) {
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "subadmin" && targetUser.role !== "admin") return true;
  if (currentUser.id === targetUser._id.toString()) return true;
  return false;
}

// دالة للتحقق من صلاحية التعديل
function canEditUser(currentUser, targetUser, updates) {
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "subadmin" && targetUser.role !== "admin") return true;
  if (currentUser.id === targetUser._id.toString()) {
    // المستخدم يمكنه تعديل بياناته فقط، لا يمكنه تغيير الدور
    return !updates.role || updates.role === targetUser.role;
  }
  return false;
}

// دالة للتحقق من صلاحية الحذف
function canDeleteUser(currentUser, targetUser) {
  if (currentUser.role === "admin" && targetUser.role !== "admin") return true;
  if (currentUser.role === "subadmin" && targetUser.role === "lawyer") return true;
  return false;
}