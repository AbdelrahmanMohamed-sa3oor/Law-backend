// models/Settings.js
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: 'نظام إدارة المكاتب القانونية'
  },
  siteLogo: {
    url: String,
    public_id: String
  },
  contactInfo: {
    phone: String,
    email: String,
    address: String,
    workingHours: String
  },
  backupSettings: {
    autoBackup: {
      type: Boolean,
      default: false
    },
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    lastBackup: Date,
    backupPath: String
  },
  exportSettings: {
    allowedFormats: {
      type: [String],
      default: ['excel', 'pdf', 'csv']
    },
    maxFileSize: {
      type: Number,
      default: 10 // MB
    },
    includeSensitiveData: {
      type: Boolean,
      default: false
    }
  },
  caseSettings: {
    caseNumberPrefix: {
      type: String,
      default: 'CASE'
    },
    autoGenerateCaseNumber: {
      type: Boolean,
      default: true
    },
    defaultCaseStatus: {
      type: String,
      default: 'جديدة'
    },
    caseCategories: [String]
  },
   createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lawyer'
  }
}, {
  timestamps: true,
    strictPopulate: false // ✅ السماح بعمل populate لحقول غير موجودة
});

// تأكد من وجود إعدادات واحدة فقط
settingsSchema.index({}, { unique: true });

export default mongoose.model('Settings', settingsSchema);