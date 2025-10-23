// models/Client.js
import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الموكل مطلوب'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'رقم الهاتف مطلوب']
  },
  email: {
    type: String,
    lowercase: true
  },
  address: {
    type: String
  },
  nationalId: {
    type: String,
    unique: true
  },
  type: {
    type: String,
    enum: ['فرد', 'شركة', 'جهة حكومية'],
    default: 'فرد'
  },
  notes: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// فهرس للبحث السريع
clientSchema.index({ name: 'text', phone: 'text', nationalId: 'text' });

export default mongoose.model('Client', clientSchema);