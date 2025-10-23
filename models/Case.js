import mongoose from "mongoose";
const caseSchema = new mongoose.Schema({
  caseNumber: String,
  year: Number,
  caseType: String,
  jurisdiction: String,
  clientName: String,
  opponentName: String,
  previousSession: Date,
  currentSession: Date,
  postponedTo: Date,
  sessionDate: Date,
  decision: String,
  request: String,
  notes: String,
  admin: String,
  paid: Number,
  remaining: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lawyer",
    required: true
  },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  expenses: Number,
  images: [
    {
      url: String,
      public_id: String
    }
  ]
}, { timestamps: true , strictPopulate: false});

export default mongoose.model("Case", caseSchema);

