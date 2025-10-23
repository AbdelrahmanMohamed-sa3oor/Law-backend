// models/Opponent.js
import mongoose from 'mongoose';

const opponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الخصم مطلوب'],
    trim: true
  },
  phone: {
    type: String
  },
  email: {
    type: String,
    lowercase: true
  },
  address: {
    type: String
  },
  nationalId: {
    type: String
  },
  type: {
    type: String,
    enum: ['فرد', 'شركة', 'جهة حكومية'],
    default: 'فرد'
  },
  representative: {
    type: String, // اسم ممثل الخصم (محامي الخصم)
    trim: true
  },
  representativePhone: {
    type: String // هاتف ممثل الخصم
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// فهرس للبحث السريع
opponentSchema.index({ name: 'text', phone: 'text', nationalId: 'text' });

export default mongoose.model('Opponent', opponentSchema);