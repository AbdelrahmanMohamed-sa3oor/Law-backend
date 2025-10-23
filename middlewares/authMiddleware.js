import jwt from "jsonwebtoken";
import Lawyer from "../models/Lawyer.js";



// التحقق من تسجيل الدخول
export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "غير مصرح - لا يوجد توكن" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔍 ابحث في Lawyer فقط
    const user = await Lawyer.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "توكن غير صالح" });
  }
};

// التحقق من الصلاحية - نفس الكود بدون تغيير
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log("✅ User role:", req.user?.role);
    console.log("✅ Allowed roles:", roles);
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "غير مصرح لك بهذه العملية" });
    }
    next();
  };
};