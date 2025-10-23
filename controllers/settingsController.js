// controllers/settingsController.js
import Settings from '../models/Settings.js';

// import Case from '../models/Case.js'; // افترض أن لديك نموذج للقضايا
import excel from 'exceljs';
import PDFDocument from 'pdfkit';
import { cloudinary } from '../Config/cloudinary.js';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import contentDisposition from 'content-disposition';
import Lawyer from '../models/Lawyer.js';
import Case from '../models/Case.js';
import Client from '../models/Client.js';
import Opponent from '../models/Opponent.js';


// 🔧 الحصول على الإعدادات
// controllers/settingsController.js
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

    // جلب جميع القضايا مع العلاقات الأساسية فقط
    const cases = await Case.find(caseQuery)
      .populate('client', 'name phone nationalId')
      .populate('opponent', 'name phone')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      // إنشاء ملف Excel
      const workbook = new ExcelJS.Workbook();

      // 📋 ورقة القضايا (الحقول المطلوبة فقط)
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
        { header: 'تاريخ الجلسة', key: 'sessionDate', width: 15 },
        { header: 'القرار', key: 'decision', width: 25 },
        { header: 'الطلب', key: 'request', width: 25 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
        { header: 'المصاريف', key: 'expenses', width: 12 },
        { header: 'هاتف الموكل', key: 'clientPhone', width: 15 },
        { header: 'الرقم القومي للموكل', key: 'clientNationalId', width: 20 },
        { header: 'هاتف الخصم', key: 'opponentPhone', width: 15 },
        { header: 'المبلغ المدفوع', key: 'feesPaid', width: 15 },
        { header: 'المبلغ المتبقي', key: 'feesRemaining', width: 15 },
        { header: 'تاريخ الإنشاء', key: 'createdAt', width: 15 },
        { header: 'تاريخ التحديث', key: 'updatedAt', width: 15 }
      ];

      // إضافة بيانات القضايا
      cases.forEach(caseItem => {
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
          sessionDate: caseItem.sessionDate ? caseItem.sessionDate.toLocaleDateString('ar-EG') : '',
          decision: caseItem.decision,
          request: caseItem.request,
          notes: caseItem.notes,
          expenses: caseItem.expenses,
          clientPhone: caseItem.client?.phone || '',
          clientNationalId: caseItem.client?.nationalId || '',
          opponentPhone: caseItem.opponent?.phone || '',
          feesPaid: caseItem.fees?.paid || 0,
          feesRemaining: caseItem.fees?.remaining || 0,
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
      // إنشاء CSV للقضايا (بنفس الحقول المطلوبة)
      let csv = 'رقم القضية,السنة,نوع القضية,الجهة القضائية,اسم الموكل,اسم الخصم,الجلسة السابقة,الجلسة الحالية,مؤجل إلى,تاريخ الجلسة,القرار,الطلب,ملاحظات,المصاريف,هاتف الموكل,الرقم القومي للموكل,هاتف الخصم,المبلغ المدفوع,المبلغ المتبقي,تاريخ الإنشاء,تاريخ التحديث\n';

      cases.forEach(caseItem => {
        csv += `"${caseItem.caseNumber}","${caseItem.year}","${caseItem.caseType}","${caseItem.jurisdiction}","${caseItem.clientName}","${caseItem.opponentName}","${caseItem.previousSession ? caseItem.previousSession.toLocaleDateString('ar-EG') : ''}","${caseItem.currentSession ? caseItem.currentSession.toLocaleDateString('ar-EG') : ''}","${caseItem.postponedTo ? caseItem.postponedTo.toLocaleDateString('ar-EG') : ''}","${caseItem.sessionDate ? caseItem.sessionDate.toLocaleDateString('ar-EG') : ''}","${caseItem.decision}","${caseItem.request}","${caseItem.notes}","${caseItem.expenses}","${caseItem.client?.phone || ''}","${caseItem.client?.nationalId || ''}","${caseItem.opponent?.phone || ''}","${caseItem.fees?.paid || 0}","${caseItem.fees?.remaining || 0}","${caseItem.createdAt.toLocaleDateString('ar-EG')}","${caseItem.updatedAt.toLocaleDateString('ar-EG')}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=legal-cases-${Date.now()}.csv`);
      res.send(csv);
    }

  } catch (err) {
    console.error('Export Cases Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// 📥 تحميل الباك أب
export const downloadBackup = async (req, res) => {
    try {
        const { backupId } = req.params;


        const mockBackupData = {
            message: 'هذا ملف النسخة الاحتياطية',
            backupId: backupId,
            timestamp: new Date(),
            note: 'في التطبيق الحقيقي، هنا بتكون البيانات الفعلية'
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup-${backupId}.json`);

        res.send(JSON.stringify(mockBackupData, null, 2));

    } catch (err) {
        console.error('Download Backup Error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// 📊 تصدير بيانات القضايا لـ Excel
export const exportCasesToExcel = async (req, res) => {
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

        const cases = await Case.find(caseQuery)
            .populate('lawyer', 'name registrationCode phone')
            .populate('client', 'name phone')
            .sort({ createdAt: -1 });

        if (format === 'excel') {
            // إنشاء ملف Excel
            const workbook = new excel.Workbook();
            const worksheet = workbook.addWorksheet('القضايا');

            // إضافة headers
            worksheet.columns = [
                { header: 'رقم القضية', key: 'caseNumber', width: 15 },
                { header: 'اسم القضية', key: 'title', width: 30 },
                { header: 'المحامي', key: 'lawyer', width: 20 },
                { header: 'الموكل', key: 'client', width: 20 },
                { header: 'الحالة', key: 'status', width: 15 },
                { header: 'تاريخ الإنشاء', key: 'createdAt', width: 15 },
                { header: 'الجلسة القادمة', key: 'nextSession', width: 15 },
                { header: 'الرسوم', key: 'fees', width: 15 }
            ];

            // إضافة البيانات
            cases.forEach(caseItem => {
                worksheet.addRow({
                    caseNumber: caseItem.caseNumber,
                    title: caseItem.title,
                    lawyer: caseItem.lawyer?.name || 'غير محدد',
                    client: caseItem.client?.name || 'غير محدد',
                    status: caseItem.status,
                    createdAt: caseItem.createdAt.toLocaleDateString('ar-EG'),
                    nextSession: caseItem.nextSession ? caseItem.nextSession.toLocaleDateString('ar-EG') : 'غير محدد',
                    fees: caseItem.fees || 0
                });
            });

            // إرسال الملف
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=cases-export-${Date.now()}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } else if (format === 'csv') {
            // إنشاء CSV
            let csv = 'رقم القضية,اسم القضية,المحامي,الموكل,الحالة,تاريخ الإنشاء,الجلسة القادمة,الرسوم\n';

            cases.forEach(caseItem => {
                csv += `"${caseItem.caseNumber}","${caseItem.title}","${caseItem.lawyer?.name || 'غير محدد'}","${caseItem.client?.name || 'غير محدد'}","${caseItem.status}","${caseItem.createdAt.toLocaleDateString('ar-EG')}","${caseItem.nextSession ? caseItem.nextSession.toLocaleDateString('ar-EG') : 'غير محدد'}","${caseItem.fees || 0}"\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=cases-export-${Date.now()}.csv`);
            res.send(csv);

        }

    } catch (err) {
        console.error('Export Cases Error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// 🖼️ تحديث لوجو الموقع
export const updateSiteLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '❌ يرجى اختيار صورة'
            });
        }

        // رفع الصورة إلى Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'site-assets',
                    transformation: [
                        { width: 200, height: 200, crop: "limit" },
                        { quality: "auto" }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        const logoData = {
            url: result.secure_url,
            public_id: result.public_id
        };

        // تحديث الإعدادات
        const settings = await Settings.findOneAndUpdate(
            {},
            { siteLogo: logoData },
            { new: true }
        );

        res.json({
            success: true,
            message: '✅ تم تحديث شعار الموقع بنجاح',
            data: {
                logo: logoData.url
            }
        });

    } catch (err) {
        console.error('Update Logo Error:', err);
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