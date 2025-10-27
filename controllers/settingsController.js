// controllers/settingsController.js
import Settings from '../models/Settings.js';
import ExcelJS from 'exceljs';
import Lawyer from '../models/Lawyer.js';
import Case from '../models/Case.js';

// 🔧 الحصول على الإعدادات
export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();

        res.json({
            success: true,
            data: settings
        });

    } catch (err) {
        console.error('Get Settings Error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};
// 🔧 تحديث الإعدادات
export const updateSettings = async (req, res) => {
    try {
        const updates = req.body;

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({
                ...updates,
                createdBy: req.user.id
            });
        } else {
            settings = await Settings.findOneAndUpdate(
                {},
                updates,
                { new: true, runValidators: true }
            );
        }

        res.json({
            success: true,
            message: '✅ تم تحديث الإعدادات بنجاح',
            data: settings
        });

    } catch (err) {
        console.error('Update Settings Error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};
// 💾 إنشاء باك أب للبيانات
export const createBackup = async (req, res) => {
  try {
    const { startDate, endDate, format = 'excel' } = req.query;

    // بناء query للقضايا
    let caseQuery = {};
    if (startDate && endDate) {
      caseQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // جلب جميع القضايا مع العلاقات
    const cases = await Case.find(caseQuery)
      .populate('createdBy', 'name registrationCode phone')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      // إنشاء ملف Excel
      const workbook = new ExcelJS.Workbook();

      // 📋 ورقة القضايا
      const casesSheet = workbook.addWorksheet('القضايا');
      casesSheet.columns = [
        { header: 'رقم القضية', key: 'caseNumber', width: 15 },
        { header: 'السنة', key: 'year', width: 10 },
        { header: 'نوع القضية', key: 'caseType', width: 20 },
        { header: 'الجهة القضائية', key: 'jurisdiction', width: 20 },
        { header: 'اسم الموكل', key: 'clientName', width: 20 },
        { header: 'اسم الخصم', key: 'opponentName', width: 20 },
        { header: 'الجلسة السابقة', key: 'previousSession', width: 15 },
        { header: 'الجلسة الحالية', key: 'currentSession', width: 15 },
        { header: 'مؤجل إلى', key: 'postponedTo', width: 15 },
        { header: 'عنوان القضية', key: 'addressCase', width: 25 },
        { header: 'عنوان الموكل', key: 'addressClient', width: 25 },
        { header: 'هاتف الموكل', key: 'phoneClient', width: 15 },
        { header: 'تاريخ الجلسة', key: 'sessionDate', width: 15 },
        { header: 'القرار', key: 'decision', width: 25 },
        { header: 'الطلب', key: 'request', width: 25 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
        { header: 'المسؤول', key: 'admin', width: 20 },
        { header: 'المصاريف', key: 'expenses', width: 12 },
        { header: 'المبلغ المدفوع', key: 'paid', width: 15 },
        { header: 'المبلغ المتبقي', key: 'remaining', width: 15 },
        { header: 'المحامي المسؤول', key: 'lawyer', width: 20 },
        { header: 'حالة الموافقة', key: 'approvalStatus', width: 15 },
        { header: 'جلسات القضية', key: 'dateSessions', width: 30 },
        { header: 'عدد الصور', key: 'imagesCount', width: 12 },
        { header: 'تاريخ الإنشاء', key: 'createdAt', width: 15 },
        { header: 'تاريخ التحديث', key: 'updatedAt', width: 15 }
      ];

      // إضافة بيانات القضايا
      cases.forEach(caseItem => {
        // معالجة جلسات القضية
        const dateSessionsText = caseItem.dateSession && caseItem.dateSession.length > 0 
          ? caseItem.dateSession.map(session => 
              `${session.date.toLocaleDateString('ar-EG')}: ${session.request || ''}`
            ).join('; ')
          : '';

        casesSheet.addRow({
          caseNumber: caseItem.caseNumber,
          year: caseItem.year,
          caseType: caseItem.caseType,
          jurisdiction: caseItem.jurisdiction,
          clientName: caseItem.clientName,
          opponentName: caseItem.opponentName,
          previousSession: caseItem.previousSession ? caseItem.previousSession.toLocaleDateString('ar-EG') : '',
          currentSession: caseItem.currentSession ? caseItem.currentSession.toLocaleDateString('ar-EG') : '',
          postponedTo: caseItem.postponedTo ? caseItem.postponedTo.toLocaleDateString('ar-EG') : '',
          addressCase: caseItem.addressCase,
          addressClient: caseItem.addressClient,
          phoneClient: caseItem.phoneClient,
          sessionDate: caseItem.sessionDate ? caseItem.sessionDate.toLocaleDateString('ar-EG') : '',
          decision: caseItem.decision,
          request: caseItem.request,
          notes: caseItem.notes,
          admin: caseItem.admin,
          expenses: caseItem.expenses,
          paid: caseItem.paid || 0,
          remaining: caseItem.remaining || 0,
          lawyer: caseItem.createdBy?.name || '',
          approvalStatus: caseItem.approvalStatus,
          dateSessions: dateSessionsText,
          imagesCount: caseItem.images ? caseItem.images.length : 0,
          createdAt: caseItem.createdAt.toLocaleDateString('ar-EG'),
          updatedAt: caseItem.updatedAt.toLocaleDateString('ar-EG')
        });
      });

      // تنسيق الرأس
      casesSheet.getRow(1).font = { bold: true, size: 12 };
      casesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      casesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };

      // إرسال الملف
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=legal-cases-backup-${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'csv') {
      // إنشاء CSV للقضايا
      let csv = 'رقم القضية,السنة,نوع القضية,الجهة القضائية,اسم الموكل,اسم الخصم,الجلسة السابقة,الجلسة الحالية,مؤجل إلى,عنوان القضية,عنوان الموكل,هاتف الموكل,تاريخ الجلسة,القرار,الطلب,ملاحظات,المسؤول,المصاريف,المبلغ المدفوع,المبلغ المتبقي,المحامي المسؤول,حالة الموافقة,جلسات القضية,عدد الصور,تاريخ الإنشاء,تاريخ التحديث\n';

      cases.forEach(caseItem => {
        // معالجة جلسات القضية
        const dateSessionsText = caseItem.dateSession && caseItem.dateSession.length > 0 
          ? caseItem.dateSession.map(session => 
              `${session.date.toLocaleDateString('ar-EG')}: ${session.request || ''}`
            ).join('; ')
          : '';

        csv += `"${caseItem.caseNumber}","${caseItem.year}","${caseItem.caseType}","${caseItem.jurisdiction}","${caseItem.clientName}","${caseItem.opponentName}","${caseItem.previousSession ? caseItem.previousSession.toLocaleDateString('ar-EG') : ''}","${caseItem.currentSession ? caseItem.currentSession.toLocaleDateString('ar-EG') : ''}","${caseItem.postponedTo ? caseItem.postponedTo.toLocaleDateString('ar-EG') : ''}","${caseItem.addressCase}","${caseItem.addressClient}","${caseItem.phoneClient}","${caseItem.sessionDate ? caseItem.sessionDate.toLocaleDateString('ar-EG') : ''}","${caseItem.decision}","${caseItem.request}","${caseItem.notes}","${caseItem.admin}","${caseItem.expenses}","${caseItem.paid || 0}","${caseItem.remaining || 0}","${caseItem.createdBy?.name || ''}","${caseItem.approvalStatus}","${dateSessionsText}","${caseItem.images ? caseItem.images.length : 0}","${caseItem.createdAt.toLocaleDateString('ar-EG')}","${caseItem.updatedAt.toLocaleDateString('ar-EG')}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=legal-cases-${Date.now()}.csv`);
      res.send(csv);

    } else if (format === 'pdf') {
      // إنشاء PDF للقضايا
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();

      // إعداد رأس الصفحة
      doc.fontSize(18).text('تقرير القضايا - جميع البيانات', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`, { align: 'center' });
      doc.moveDown();

      // إضافة بيانات القضايا
      cases.forEach((caseItem, index) => {
        // صفحة جديدة لكل قضية
        if (index > 0) {
          doc.addPage();
        }

        doc.fontSize(16).text(`القضية ${index + 1}: ${caseItem.caseNumber}`, { continued: false });
        doc.moveDown();
        
        doc.fontSize(12);
        doc.text(`رقم القضية: ${caseItem.caseNumber}`);
        doc.text(`السنة: ${caseItem.year}`);
        doc.text(`نوع القضية: ${caseItem.caseType}`);
        doc.text(`الجهة القضائية: ${caseItem.jurisdiction}`);
        doc.text(`اسم الموكل: ${caseItem.clientName}`);
        doc.text(`اسم الخصم: ${caseItem.opponentName}`);
        doc.text(`عنوان القضية: ${caseItem.addressCase}`);
        doc.text(`عنوان الموكل: ${caseItem.addressClient}`);
        doc.text(`هاتف الموكل: ${caseItem.phoneClient}`);
        doc.text(`الجلسة السابقة: ${caseItem.previousSession ? caseItem.previousSession.toLocaleDateString('ar-EG') : ''}`);
        doc.text(`الجلسة الحالية: ${caseItem.currentSession ? caseItem.currentSession.toLocaleDateString('ar-EG') : ''}`);
        doc.text(`مؤجل إلى: ${caseItem.postponedTo ? caseItem.postponedTo.toLocaleDateString('ar-EG') : ''}`);
        doc.text(`تاريخ الجلسة: ${caseItem.sessionDate ? caseItem.sessionDate.toLocaleDateString('ar-EG') : ''}`);
        doc.text(`القرار: ${caseItem.decision}`);
        doc.text(`الطلب: ${caseItem.request}`);
        doc.text(`ملاحظات: ${caseItem.notes}`);
        doc.text(`المسؤول: ${caseItem.admin}`);
        doc.text(`المصاريف: ${caseItem.expenses}`);
        doc.text(`المبلغ المدفوع: ${caseItem.paid || 0}`);
        doc.text(`المبلغ المتبقي: ${caseItem.remaining || 0}`);
        doc.text(`المحامي المسؤول: ${caseItem.createdBy?.name || ''}`);
        doc.text(`حالة الموافقة: ${caseItem.approvalStatus}`);
        
        // جلسات القضية
        if (caseItem.dateSession && caseItem.dateSession.length > 0) {
          doc.text('جلسات القضية:');
          caseItem.dateSession.forEach((session, sessionIndex) => {
            doc.text(`  ${sessionIndex + 1}. ${session.date.toLocaleDateString('ar-EG')} - ${session.request || ''}`);
          });
        }
        
        doc.text(`عدد الصور: ${caseItem.images ? caseItem.images.length : 0}`);
        doc.text(`تاريخ الإنشاء: ${caseItem.createdAt.toLocaleDateString('ar-EG')}`);
        doc.text(`تاريخ التحديث: ${caseItem.updatedAt.toLocaleDateString('ar-EG')}`);
        doc.moveDown();
      });

      // إرسال الملف
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=legal-cases-${Date.now()}.pdf`);

      doc.pipe(res);
      doc.end();
    }

  } catch (err) {
    console.error('Export Cases Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// 📈 إحصائيات النظام
export const getSystemStats = async (req, res) => {
    try {
        const totalLawyers = await Lawyer.countDocuments();
        const activeLawyers = await Lawyer.countDocuments({ isActive: true });
        const totalCases = await Case.countDocuments();
        const pendingCases = await Case.countDocuments({ status: 'قيد النظر' });

        const settings = await Settings.findOne();

        res.json({
            success: true,
            data: {
                lawyers: {
                    total: totalLawyers,
                    active: activeLawyers,
                    inactive: totalLawyers - activeLawyers
                },
                cases: {
                    total: totalCases,
                    pending: pendingCases
                },
                system: {
                    lastBackup: settings?.backupSettings?.lastBackup,
                    autoBackup: settings?.backupSettings?.autoBackup
                }
            }
        });

    } catch (err) {
        console.error('System Stats Error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// في controllers/settingsController.js - دالة createFullBackup
export const createFullBackup = async (req, res) => {
  try {
    console.log('🔄 بدء إنشاء النسخة الاحتياطية الكاملة...');

    // جلب جميع البيانات
    const [lawyers, cases, settings] = await Promise.all([
      Lawyer.find().select('-password').lean(),
      Case.find().populate('createdBy', 'name registrationCode phone').lean(),
      Settings.findOne().lean(),
    ]);

    // تحقق من وجود بيانات
    if (!lawyers || !cases) {
      return res.status(404).json({
        success: false,
        message: '❌ لا توجد بيانات للحفظ'
      });
    }

    // إنشاء كائن النسخة الاحتياطية
    const backupData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        totalRecords: {
          lawyers: lawyers.length,
          cases: cases.length,
          settings: settings ? 1 : 0,
        }
      },
      data: {
        lawyers: lawyers || [],
        cases: cases || [],
        settings: settings || {},
      }
    };

    console.log('📁 بيانات النسخة الاحتياطية:', {
      lawyers: backupData.data.lawyers.length,
      cases: backupData.data.cases.length
    });

    // تحويل البيانات إلى JSON
    const jsonData = JSON.stringify(backupData, null, 2);
    
    // تحقق من أن JSON صالح
    if (!jsonData || jsonData === '{}') {
      return res.status(500).json({
        success: false,
        message: '❌ فشل في إنشاء ملف JSON'
      });
    }

    console.log('✅ تم إنشاء ملف JSON بحجم:', jsonData.length, 'حرف');

    // إرسال الملف
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
    res.setHeader('Content-Length', jsonData.length);
    
    res.send(jsonData);

    console.log('🎉 تم إرسال النسخة الاحتياطية بنجاح');

  } catch (err) {
    console.error('❌ Create Full Backup Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📥 استعادة البيانات من النسخة الاحتياطية
export const restoreBackup = async (req, res) => {
  try {
    console.log('🔄 بدء استعادة البيانات...');
    
    // تحقق إضافي من الملف
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: '❌ لم يتم تحميل الملف بشكل صحيح'
      });
    }

    console.log('📁 الملف المستلم:', {
      name: req.file.originalname,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });

    let fileContent;
    try {
      fileContent = req.file.buffer.toString('utf8');
      console.log('📄 محتوى الملف (الأول 200 حرف):', fileContent.substring(0, 200));
    } catch (bufferError) {
      console.error('❌ خطأ في قراءة الملف:', bufferError);
      return res.status(400).json({
        success: false,
        message: '❌ لا يمكن قراءة الملف'
      });
    }

    // تحقق من أن المحتوى ليس فارغاً
    if (!fileContent || fileContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '❌ الملف فارغ'
      });
    }

    let backupData;
    try {
      backupData = JSON.parse(fileContent);
      console.log('✅ تم تحليل ملف JSON بنجاح');
    } catch (parseError) {
      console.error('❌ خطأ في تحليل JSON:', parseError.message);
      console.error('❌ محتوى الملف الكامل:', fileContent);
      return res.status(400).json({
        success: false,
        message: `❌ ملف JSON غير صالح: ${parseError.message}`
      });
    }

    // تحقق من البيانات
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({
        success: false,
        message: '❌ ملف JSON يجب أن يحتوي على كائن بيانات'
      });
    }

    console.log('📊 نوع البيانات:', typeof backupData);
    console.log('📊 مفاتيح البيانات:', Object.keys(backupData));

    // استخدم البيانات مباشرة أو من data property
    const dataToRestore = backupData.data || backupData;
    
    if (!dataToRestore || typeof dataToRestore !== 'object') {
      return res.status(400).json({
        success: false,
        message: '❌ لا توجد بيانات صالحة في الملف'
      });
    }

    let restoredCount = 0;
    const results = {};

    // استعادة المحامين
    if (dataToRestore.lawyers && Array.isArray(dataToRestore.lawyers)) {
      try {
        console.log(`👥 جاري استعادة ${dataToRestore.lawyers.length} محامي...`);
        const lawyersResult = await Lawyer.insertMany(dataToRestore.lawyers, { ordered: false });
        restoredCount += lawyersResult.length;
        results.lawyers = lawyersResult.length;
        console.log(`✅ تم استعادة ${lawyersResult.length} محامي`);
      } catch (lawyerError) {
        console.error('❌ خطأ في استعادة المحامين:', lawyerError.message);
        if (lawyerError.result) {
          results.lawyers = lawyerError.result.nInserted || 0;
          restoredCount += results.lawyers;
        }
      }
    }

    // استعادة القضايا
    if (dataToRestore.cases && Array.isArray(dataToRestore.cases)) {
      try {
        console.log(`⚖️ جاري استعادة ${dataToRestore.cases.length} قضية...`);
        
        const processedCases = dataToRestore.cases.map(caseItem => {
          const processed = { ...caseItem };
          
          // إضافة createdBy إذا مش موجود
          if (!processed.createdBy) {
            processed.createdBy = req.user._id;
          }
          
          return processed;
        });

        const casesResult = await Case.insertMany(processedCases, { ordered: false });
        restoredCount += casesResult.length;
        results.cases = casesResult.length;
        console.log(`✅ تم استعادة ${casesResult.length} قضية`);
      } catch (caseError) {
        console.error('❌ خطأ في استعادة القضايا:', caseError.message);
        if (caseError.result) {
          results.cases = caseError.result.nInserted || 0;
          restoredCount += results.cases;
        }
      }
    }

    console.log('🎉 نتائج الاستعادة:', { restoredCount, results });

    res.json({
      success: true,
      message: restoredCount > 0 ? `✅ تم استعادة ${restoredCount} سجل بنجاح` : '⚠️ لم يتم استعادة أي بيانات',
      data: {
        totalRestored: restoredCount,
        details: results
      }
    });

  } catch (err) {
    console.error('❌ Restore Backup Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📋 الحصول على معلومات النسخ الاحتياطية
export const getBackupInfo = async (req, res) => {
  try {
    const [lawyersCount, casesCount, settingsCount] = await Promise.all([
      Lawyer.countDocuments(),
      Case.countDocuments(),
      Settings.countDocuments(),
      // Client.countDocuments(),
      // Opponent.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        totalRecords: lawyersCount + casesCount + settingsCount,
        details: {
          lawyers: lawyersCount,
          cases: casesCount,
          settings: settingsCount,
          // clients: clientsCount,
          // opponents: opponentsCount,
        },
        lastBackup: null, // يمكنك إضافة نظام لتتبع آخر نسخة
        recommendedAction: lawyersCount + casesCount > 1000 ? 
          'يوصى بعمل نسخة احتياطية بسبب كمية البيانات الكبيرة' : 
          'البيانات في نطاق آمن'
      }
    });

  } catch (err) {
    console.error('❌ Get Backup Info Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};