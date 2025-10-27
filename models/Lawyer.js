import mongoose from "mongoose";

const lawyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registrationNumber: { type: String, required: true }, // رقم القيد
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
  address: { type: String, required: true },
  image: { 
    type: {
      url: String,
      public_id: String
    },
    default: null
  },
  registrationCode: { type: String, required: true, unique: true }, // 6 أرقام
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "subadmin", "lawyer","secretary"],
    default: "lawyer"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  phone : {type:String},
}, { timestamps: true });

// ✅ توليد كود تلقائي لو مش مضاف
lawyerSchema.pre("validate", function (next) {
  if (!this.registrationCode) {
    this.registrationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

export default mongoose.model("Lawyer", lawyerSchema);

