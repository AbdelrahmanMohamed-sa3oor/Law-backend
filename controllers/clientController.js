// controllers/clientController.js
import Client from '../models/Client.js';

// 📋 الحصول على جميع العملاء
export const getClients = async (req, res) => {
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

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: clients,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get Clients Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔍 البحث في العملاء
export const searchClients = async (req, res) => {
  try {
    const { q } = req.query;
    
    const clients = await Client.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { nationalId: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);

    res.json({
      success: true,
      data: clients
    });

  } catch (error) {
    console.error('Search Clients Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👤 الحصول على عميل محدد
export const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'العميل غير موجود'
      });
    }

    res.json({
      success: true,
      data: client
    });

  } catch (error) {
    console.error('Get Client Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ➕ إنشاء عميل جديد
export const createClient = async (req, res) => {
  try {
    const clientData = req.body;
    
    // التحقق من عدم تكرار الرقم القومي
    if (clientData.nationalId) {
      const existingClient = await Client.findOne({ nationalId: clientData.nationalId });
      if (existingClient) {
        return res.status(400).json({
          success: false,
          error: 'الرقم القومي مسجل مسبقاً'
        });
      }
    }

    const client = await Client.create(clientData);

    res.status(201).json({
      success: true,
      message: '✅ تم إنشاء العميل بنجاح',
      data: client
    });

  } catch (error) {
    console.error('Create Client Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث العميل
export const updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'العميل غير موجود'
      });
    }

    res.json({
      success: true,
      message: '✅ تم تحديث العميل بنجاح',
      data: client
    });

  } catch (error) {
    console.error('Update Client Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🗑️ حذف العميل
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'العميل غير موجود'
      });
    }

    res.json({
      success: true,
      message: '✅ تم حذف العميل بنجاح'
    });

  } catch (error) {
    console.error('Delete Client Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};