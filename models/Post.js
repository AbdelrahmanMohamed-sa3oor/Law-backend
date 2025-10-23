import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  image: {
    url: String,
    public_id: String
  },
  target: {
    type: String,
    enum: ["all", "specific"],
    default: "all"
  },
  targetLawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lawyer",
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lawyer",
    required: true
  }
}, { timestamps: true });

export default mongoose.model("Post", postSchema);
