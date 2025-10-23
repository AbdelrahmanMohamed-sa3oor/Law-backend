// controllers/opponentController.js
import Opponent from '../models/Opponent.js';

// 📋 الحصول على جميع الخصوم
export const getOpponents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } }
      ];
    }

    const opponents = await Opponent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Opponent.countDocuments(query);

    res.json({
      success: true,
      data: opponents,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get Opponents Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔍 البحث في الخصوم
export const searchOpponents = async (req, res) => {
  try {
    const { q } = req.query;
    
    const opponents = await Opponent.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { nationalId: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);

    res.json({
      success: true,
      data: opponents
    });

  } catch (error) {
    console.error('Search Opponents Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👤 الحصول على خصم محدد
export const getOpponent = async (req, res) => {
  try {
    const opponent = await Opponent.findById(req.params.id);
    
    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'الخصم غير موجود'
      });
    }

    res.json({
      success: true,
      data: opponent
    });

  } catch (error) {
    console.error('Get Opponent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ➕ إنشاء خصم جديد
export const createOpponent = async (req, res) => {
  try {
    const opponentData = req.body;

    const opponent = await Opponent.create(opponentData);

    res.status(201).json({
      success: true,
      message: '✅ تم إنشاء الخصم بنجاح',
      data: opponent
    });

  } catch (error) {
    console.error('Create Opponent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث الخصم
export const updateOpponent = async (req, res) => {
  try {
    const opponent = await Opponent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'الخصم غير موجود'
      });
    }

    res.json({
      success: true,
      message: '✅ تم تحديث الخصم بنجاح',
      data: opponent
    });

  } catch (error) {
    console.error('Update Opponent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🗑️ حذف الخصم
export const deleteOpponent = async (req, res) => {
  try {
    const opponent = await Opponent.findByIdAndDelete(req.params.id);

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'الخصم غير موجود'
      });
    }

    res.json({
      success: true,
      message: '✅ تم حذف الخصم بنجاح'
    });

  } catch (error) {
    console.error('Delete Opponent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};