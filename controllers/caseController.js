// // controllers / caseController.js

import { cloudinary } from "../Config/cloudinary.js";
import Case from "../models/Case.js";

// ✅ إضافة قضية جديدة
export const createCase = async (req, res) => {
  try {
    const {
      caseNumber,
      year,
      caseType,
      jurisdiction,
      clientName,
      opponentName,
      previousSession,
      currentSession,
      postponedTo,
      sessionDate,
      decision,
      request,
      notes,
      admin,
      expenses,
      paid,      // استقبل منفصل
      remaining  // استقبل منفصل
    } = req.body;

    // ✅ رفع الصور إلى Cloudinary
    let images = [];
    if (req.files && req.files.length > 0) {
      console.log("🔼 Uploading images to Cloudinary...");
      
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'law-cases',
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('✅ File uploaded:', result.secure_url);
                resolve(result);
              }
            }
          );
          
          uploadStream.end(file.buffer);
        });
      });

      try {
        const results = await Promise.all(uploadPromises);
        images = results.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type
        }));
        console.log(`✅ ${images.length} files uploaded successfully`);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload failed:', uploadError);
        return res.status(500).json({ error: 'فشل في رفع الملفات' });
      }
    }

    // تحويل البيانات وتنظيفها
    const caseData = {
      caseNumber,
      year: year ? parseInt(year) : new Date().getFullYear(),
      caseType,
      jurisdiction,
      clientName,
      opponentName,
      notes,
      paid: paid ? parseFloat(paid) : 0,           // ✅ هنا
      remaining: remaining ? parseFloat(remaining) : 0 ,
      admin,
      lawyer: req.user._id,
      createdBy: req.user._id,
      approvalStatus: req.user.role === "admin" ? "approved" : "pending"
    };

    // إضافة الحقول الاختيارية إذا كانت موجودة
    if (previousSession) caseData.previousSession = new Date(previousSession);
    if (currentSession) caseData.currentSession = new Date(currentSession);
    if (postponedTo) caseData.postponedTo = new Date(postponedTo);
    if (sessionDate) caseData.sessionDate = new Date(sessionDate);
    if (decision) caseData.decision = decision;
    if (request) caseData.request = request;
    if (expenses) caseData.expenses = parseFloat(expenses);

    // إضافة الصور إذا كانت موجودة
    if (images.length > 0) {
      caseData.images = images;
    }

    console.log("💾 Saving case to database:", caseData);

    const newCase = await Case.create(caseData);

    res.status(201).json({
      success: true,
      message: req.user.role === "admin" 
        ? "تم إضافة القضية مباشرة" 
        : "تم إرسال القضية وفي انتظار الموافقة من المسؤل الرئيسي",
      case: newCase
    });

  } catch (err) {
    console.error("❌ Create Case Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ✅ جلب قضية واحدة
export const getCaseById = async (req, res) => {
  try {
    const foundCase = await Case.findById(req.params.id)
      .populate('createdBy', 'name email role');

    if (!foundCase) {
      return res.status(404).json({
        success: false,
        message: "القضية غير موجودة"
      });
    }

    res.json({
      success: true,
      case: foundCase
    });
  } catch (err) {
    console.error("❌ Get Case Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ✅ تحديث قضية
export const updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📝 Update Case Request:', {
      params: req.params,
      body: req.body,
      files: req.files,
      deletedImages: req.body.deletedImages
    });

    // جلب القضية الحالية أولاً علشان نعرف الصور القديمة
    const existingCase = await Case.findById(id);
    if (!existingCase) {
      return res.status(404).json({
        success: false,
        message: "القضية غير موجودة"
      });
    }

    let updateData = { ...req.body };
    
    // معالجة التواريخ إذا كانت موجودة
    const dateFields = ['previousSession', 'currentSession', 'postponedTo', 'sessionDate'];
    dateFields.forEach(field => {
      if (updateData[field] && updateData[field] !== '') {
        updateData[field] = new Date(updateData[field]);
      } else {
        delete updateData[field]; // احذف الحقل إذا كان فارغ
      }
    });
    
    // معالجة الأرقام إذا كانت موجودة
    const numberFields = ['year', 'expenses', 'paid', 'remaining'];
    numberFields.forEach(field => {
      if (updateData[field] && updateData[field] !== '') {
        updateData[field] = parseFloat(updateData[field]);
      } else {
        delete updateData[field]; // احذف الحقل إذا كان فارغ
      }
    });

    // التعامل مع الصور المحذوفة
    let finalImages = [...existingCase.images]; // نبدأ بالصور القديمة

    if (req.body.deletedImages) {
      try {
        const deletedImages = JSON.parse(req.body.deletedImages);
        console.log('🗑️ Deleting images:', deletedImages);
        
        if (Array.isArray(deletedImages)) {
          // حذف الصور من Cloudinary
          const deletePromises = deletedImages.map(image => {
            if (image.public_id) {
              return cloudinary.uploader.destroy(image.public_id);
            }
            return Promise.resolve();
          });
          
          await Promise.all(deletePromises);
          
          // إزالة الصور المحذوفة من الـ array
          finalImages = finalImages.filter(existingImage => 
            !deletedImages.some(deleted => deleted.public_id === existingImage.public_id)
          );
        }
      } catch (parseError) {
        console.error('❌ Error parsing deletedImages:', parseError);
      }
    }

    // إضافة الصور الجديدة
    if (req.files && req.files.length > 0) {
      console.log('🔼 Uploading new images to Cloudinary...');
      
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'law-cases',
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('✅ New file uploaded:', result.secure_url);
                resolve({
                  url: result.secure_url,
                  public_id: result.public_id,
                  resource_type: result.resource_type
                });
              }
            }
          );
          
          uploadStream.end(file.buffer);
        });
      });

      try {
        const newImages = await Promise.all(uploadPromises);
        finalImages = [...finalImages, ...newImages];
        console.log(`✅ ${newImages.length} new files uploaded successfully`);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload failed:', uploadError);
        return res.status(500).json({ 
          success: false,
          error: 'فشل في رفع الملفات الجديدة' 
        });
      }
    }

    // تحديث الـ images في الـ updateData
    updateData.images = finalImages;

    // احذف الحقول اللي مش محتاجينها
    delete updateData.deletedImages;
    delete updateData.attachments;

    console.log('💾 Final update data:', updateData);

    const updated = await Case.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: "تم تحديث القضية بنجاح",
      case: updated
    });
  } catch (err) {
    console.error("❌ Update Case Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
// ✅ حذف قضية
export const deleteCase = async (req, res) => {
  try {
    const deleted = await Case.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "القضية غير موجودة"
      });
    }

    // حذف الصور من Cloudinary إذا كانت موجودة
    if (deleted.images && deleted.images.length > 0) {
      const deletePromises = deleted.images.map(image => 
        cloudinary.uploader.destroy(image.public_id)
      );
      await Promise.all(deletePromises);
    }

    res.json({
      success: true,
      message: "تم حذف القضية بنجاح"
    });
  } catch (err) {
    console.error("❌ Delete Case Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ✅ عرض القضايا المعلقة
export const getPendingCases = async (req, res) => {
  try {
    const pendingCases = await Case.find({ approvalStatus: "pending" })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingCases.length,
      cases: pendingCases
    });
  } catch (err) {
    console.error("❌ Get Pending Cases Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ✅ موافقة أو رفض قضية
export const approveOrRejectCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "الإجراء غير صالح"
      });
    }

    if (action === "approve") {
      // الموافقة على القضية - تحديث الحالة فقط
      const updated = await Case.findByIdAndUpdate(
        id, 
        { approvalStatus: "approved" }, 
        { new: true }
      ).populate("createdBy", "name email");

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "القضية غير موجودة"
        });
      }

      return res.json({
        success: true,
        message: "تم الموافقة على القضية",
        case: updated
      });
    } else {
      // رفض القضية - حذف من قاعدة البيانات
      const deleted = await Case.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "القضية غير موجودة"
        });
      }

      return res.json({
        success: true,
        message: "تم رفض وحذف القضية",
        case: deleted
      });
    }
  } catch (err) {
    console.error("Approve/Reject Case Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ✅جلب القضايا ب عدد الصفحات 
export const getCasesPage = async (req, res) => {
  try {
    const { caseNumber, clientName, year, sessionDate, page = 1, limit = 10 } = req.query;

    const filter = { approvalStatus: "approved" }; // فلتر للحالات المعتمدة فقط
    const statsFilter = {}; // فلتر منفصل للإحصائيات

    // تطبيق الفلاتر على البحث الرئيسي
    if (caseNumber) {
      filter.caseNumber = { $regex: caseNumber, $options: "i" };
      statsFilter.caseNumber = { $regex: caseNumber, $options: "i" };
    }
    if (clientName) {
      filter.clientName = { $regex: clientName, $options: "i" };
      statsFilter.clientName = { $regex: clientName, $options: "i" };
    }
    if (year) {
      filter.year = Number(year);
      statsFilter.year = Number(year);
    }
    if (sessionDate) {
      const start = new Date(sessionDate);
      const end = new Date(sessionDate);
      end.setHours(23, 59, 59, 999);
      filter.sessionDate = { $gte: start, $lte: end };
      statsFilter.sessionDate = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;

    // جلب البيانات الرئيسية + الإحصائيات في نفس الوقت
    const [cases, total, pendingCount, approvedCount] = await Promise.all([
      // البيانات الرئيسية (المعتمدة فقط)
      Case.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      
      // العدد الإجمالي للحالات المعتمدة بعد الفلتر
      Case.countDocuments(filter),
      
      // عدد الحالات pending (باستخدام نفس الفلتر لكن مع حالة pending)
      Case.countDocuments({ ...statsFilter, approvalStatus: "pending" }),
      
      // عدد الحالات approved (باستخدام نفس الفلتر لكن مع حالة approved)
      Case.countDocuments({ ...statsFilter, approvalStatus: "approved" })
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      results: cases,
      // الإحصائيات الإضافية
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        totalWithFilter: pendingCount + approvedCount // إجمالي الحالات مع الفلتر بغض النظر عن الحالة
      }
    });
  } catch (err) {
    console.error(" Search Cases Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
// البحث في القضايا بكل الصفحات
export const searchCases = async (req, res) => {
  try {
    const { caseNumber, clientName, year, sessionDate, postponedTo } = req.query; // اضف postponedTo
    
    console.log('Search query:', req.query);
    console.log('Raw params:', { caseNumber, clientName, year, sessionDate, postponedTo });

    const filter = { approvalStatus: "approved" };

    if (caseNumber) filter.caseNumber = { $regex: caseNumber, $options: "i" };
    if (clientName) filter.clientName = { $regex: clientName, $options: "i" };
    if (year) filter.year = Number(year);
    
    // البحث على sessionDate
    if (sessionDate) {
      const start = new Date(sessionDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(sessionDate);
      end.setHours(23, 59, 59, 999);
      
      filter.sessionDate = { $gte: start, $lte: end };
    }
    
    // البحث على postponedTo (موعد الجلسة القادمة)
    if (postponedTo) {
      const start = new Date(postponedTo);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(postponedTo);
      end.setHours(23, 59, 59, 999);
      
      filter.postponedTo = { $gte: start, $lte: end };
    }

    console.log('Final filter:', filter);

    const cases = await Case.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('Found cases:', cases.length);

    res.json({
      success: true,
      total: cases.length,
      results: cases
    });
  } catch (err) {
    console.error("Search Cases Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
// تحليل ع القضايا الجرد
export const getCaseStats= async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // إحصائيات أساسية
    const basicStats = await Case.aggregate([
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalExpenses: { $sum: '$expenses' },
          totalFeesPaid: { $sum: '$paid' },
          totalFeesRemaining: { $sum: '$remaining' }
        }
      }
    ]);

    // إحصائيات حسب الشهر
    const monthlyStats = await Case.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalExpenses: { $sum: '$expenses' },
          totalFeesPaid: { $sum: '$paid' }
        }
      }
    ]);

    // إحصائيات حسب السنة
    const yearlyStats = await Case.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalExpenses: { $sum: '$expenses' },
          totalFeesPaid: { $sum: '$paid' }
        }
      }
    ]);

    // إحصائيات حسب نوع القضية
    const caseTypeStats = await Case.aggregate([
      {
        $group: {
          _id: '$caseType',
          count: { $sum: 1 },
          totalFeesPaid: { $sum: '$paid' },
          totalExpenses: { $sum: '$expenses' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // تحويل النتائج
    const formattedStats = {
      overview: {
        total: await Case.countDocuments(),
        totalExpenses: 0,
        totalFeesPaid: 0,
        totalFeesRemaining: 0,
        netProfit: 0
      },
      byStatus: {
        pending: 0,
        approved: 0,
        rejected: 0
      },
      monthly: {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        revenue: 0,
        expenses: 0
      },
      yearly: {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        revenue: 0,
        expenses: 0
      },
      byCaseType: caseTypeStats,
      financial: {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0
      }
    };

    // معالجة الإحصائيات الأساسية
    basicStats.forEach(stat => {
      formattedStats.byStatus[stat._id] = stat.count;
      formattedStats.overview.totalExpenses += stat.totalExpenses || 0;
      formattedStats.overview.totalFeesPaid += stat.totalFeesPaid || 0;
      formattedStats.overview.totalFeesRemaining += stat.totalFeesRemaining || 0;
    });

    // معالجة إحصائيات الشهر
    monthlyStats.forEach(stat => {
      formattedStats.monthly.total += stat.count;
      formattedStats.monthly[stat._id] = stat.count;
      formattedStats.monthly.revenue += stat.totalFeesPaid || 0;
      formattedStats.monthly.expenses += stat.totalExpenses || 0;
    });

    // معالجة إحصائيات السنة
    yearlyStats.forEach(stat => {
      formattedStats.yearly.total += stat.count;
      formattedStats.yearly[stat._id] = stat.count;
      formattedStats.yearly.revenue += stat.totalFeesPaid || 0;
      formattedStats.yearly.expenses += stat.totalExpenses || 0;
    });

    // حساب الربح والخسارة
    formattedStats.financial.totalRevenue = formattedStats.overview.totalFeesPaid;
    formattedStats.financial.totalExpenses = formattedStats.overview.totalExpenses;
    formattedStats.financial.netProfit = formattedStats.financial.totalRevenue - formattedStats.financial.totalExpenses;
    formattedStats.financial.profitMargin = formattedStats.financial.totalRevenue > 0 ? 
      (formattedStats.financial.netProfit / formattedStats.financial.totalRevenue) * 100 : 0;

    formattedStats.overview.netProfit = formattedStats.financial.netProfit;

    res.json({
      success: true,
      stats: formattedStats,
      period: {
        currentMonth,
        currentYear
      }
    });
  } catch (err) {
    console.error("Get Detailed Stats Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
// القضاية قبل موعدها بي،وم
export const getTomorrowCases = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 📅 تحديد يوم الغد
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfTomorrow = new Date(tomorrow);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // 🔍 البحث عن القضايا التي موعد جلستها غدًا
    const cases = await Case.find({
      postponedTo: { $gte: startOfTomorrow, $lte: endOfTomorrow },
    }).sort({ postponedTo: 1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases,
    });
  } catch (error) {
    console.error("❌ Error fetching tomorrow cases:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب القضايا القادمة",
    });
  }
};