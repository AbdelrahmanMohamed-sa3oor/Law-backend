import Document from "../models/Document.js";

// 📝 إنشاء بوست جديد مع حفظ التنسيقات
export const createDocument = (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: {
        title,
        description,
        filePath: file.path,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// 📄 جلب كل البوستات (HTML بيرجع كما هو)
export const getDocument = async (req, res) => {
  try {
    const posts = await Document.find().sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
