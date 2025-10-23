import { cloudinary } from "../Config/cloudinary.js";
import Lawyer from "../models/Lawyer.js";
import Post from "../models/Post.js";

// controllers/postController.js
export const createPost = async (req, res) => {
  try {
    // تحقق من وجود البيانات المطلوبة
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "لم يتم إرسال أي بيانات"
      });
    }

    const { title, message, target, targetLawyer } = req.body;

    // تحقق من الحقول المطلوبة
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "العنوان والمحتوى مطلوبان"
      });
    }

    // تحقق من وجود المستخدم
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "المستخدم غير معروف"
      });
    }

    let imageData = null;

    // ✅ رفع الصورة إذا وجدت
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "posts",
              resource_type: "image"
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          uploadStream.end(req.file.buffer);
        });

        imageData = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      } catch (uploadError) {
        console.error(" Cloudinary upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "فشل في رفع الصورة"
        });
      }
    }

    // إنشاء البوست
    const newPost = await Post.create({
      title,
      message,
      target: target || "all", // قيمة افتراضية
      targetLawyer: target === "specific" ? targetLawyer : null,
      image: imageData,
      createdBy: req.user._id, // ✅ الآن بتكون موجود
    });

    // إعادة البوست مع بيانات المستخدم
    const populatedPost = await Post.findById(newPost._id)
      .populate("createdBy", "name email")
      .populate("targetLawyer", "name email");

    res.status(201).json({
      success: true,
      message: " تم إنشاء البوست بنجاح",
    });

  } catch (error) {
    console.error("❌ Error creating post:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// controllers/postController.js
export const getPosts = async (req, res) => {
  try {
    console.log('📥 Request User:', req.user);
    
    // تحقق من وجود المستخدم أولاً
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "المستخدم غير معروف، يرجى تسجيل الدخول مرة أخرى"
      });
    }

    const userId = req.user._id;
    const userRole = req.user.role;

    console.log('👤 User ID:', userId);
    console.log('🎭 User Role:', userRole);

    let posts = [];

    if (userRole === 'admin') {
      // 🟢 ADMIN - بيشوف كل البوستات بدون قيود
      posts = await Post.find()
        .populate("targetLawyer", "name email image role")
        .populate("createdBy", "name image role")
        .sort({ createdAt: -1 });
      
    } else {
      // 🟢 USERS العاديين - نظام الخصوصية
      posts = await Post.find({
        $or: [
          // 1. البوستات العامة - اللي target: 'all'
          { target: 'all' },
          
          // 2. البوستات الخاصة المرسلة له بالذات
          { 
            target: 'specific', 
            targetLawyer: userId 
          },
          
          // 3. البوستات اللي هو عاملها (حتى لو خاصة لشخص آخر)
          { createdBy: userId }
        ]
      })
      .populate("targetLawyer", "name email image role")
      .populate("createdBy", "name image role")
      .sort({ createdAt: -1 });
    }

    console.log('📝 Posts found:', posts.length);

    res.status(200).json({ 
      success: true, 
      count: posts.length, 
      data: posts 
    });
    
  } catch (error) {
    console.error('❌ Error in getPosts:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  } 
};

export const getUserPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // User - يجيب البوستات الخاصة به فقط
    const posts = await Post.find({
      $or: [
        { createdBy: userId }, // البوستات اللي هو عاملها
        { targetLawyer: userId }, // البوستات الخاصة المرسلة له
        { target: "public" } // البوستات العامة
      ]
    })
    .populate("targetLawyer", "name email")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } 
};

export const getLawyers = async (req, res) => {
  try {
    const lawyers = await Lawyer.find({}, 'name isActive image role');
    res.status(200).json({
      success: true,
      count: lawyers.length,
      data: lawyers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
// controllers/postController.js
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // تحقق من وجود البوست
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "المنشور غير موجود"
      });
    }

    // تحقق إذا كان المستخدم هو منشئ البوست
    if (post.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بحذف هذا المنشور. يمكنك حذف المنشورات التي قمت بنشرها فقط"
      });
    }

    // إذا كان البوست يحتوي على صورة، احذفها من Cloudinary أولاً
    if (post.image && post.image.public_id) {
      try {
        await cloudinary.uploader.destroy(post.image.public_id);
        console.log('🗑️ تم حذف الصورة من Cloudinary:', post.image.public_id);
      } catch (cloudinaryError) {
        console.error('❌ خطأ في حذف الصورة من Cloudinary:', cloudinaryError);
        // نستمر في عملية الحذف حتى لو فشل حذف الصورة
      }
    }

    // احذف البوست من قاعدة البيانات
    await Post.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "تم حذف المنشور بنجاح"
    });

  } catch (error) {
    console.error("❌ Error deleting post:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};