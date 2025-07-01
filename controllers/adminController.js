const User = require('../models/User');
const Provider = require('../models/Provider');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const paginate = require('../utils/paginate');
const buildFilterQuery = require('../utils/filterQuery');

// Admin dashboard summary
exports.getDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await Provider.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalServices = await Service.countDocuments();
    res.json({ totalUsers, totalProviders, totalAppointments, totalServices });
  } catch (err) {
    next(err);
  }
};

// Users
exports.listUsers = async (req, res, next) => {
  try {
    const data = await paginate(User, {}, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
exports.blockUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
    res.json({ message: 'User blocked' });
  } catch (err) {
    next(err);
  }
};
exports.unblockUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    next(err);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// Providers
exports.listProviders = async (req, res, next) => {
  try {
    const data = await paginate(Provider, {}, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
exports.blockProvider = async (req, res, next) => {
  try {
    await Provider.findByIdAndUpdate(req.params.id, { isBlocked: true });
    res.json({ message: 'Provider blocked' });
  } catch (err) {
    next(err);
  }
};
exports.unblockProvider = async (req, res, next) => {
  try {
    await Provider.findByIdAndUpdate(req.params.id, { isBlocked: false });
    res.json({ message: 'Provider unblocked' });
  } catch (err) {
    next(err);
  }
};
exports.deleteProvider = async (req, res, next) => {
  try {
    await Provider.findByIdAndDelete(req.params.id);
    res.json({ message: 'Provider deleted' });
  } catch (err) {
    next(err);
  }
};

// Appointments
exports.listAppointments = async (req, res, next) => {
  try {
    const { page = 1, status, search, startDate, endDate } = req.query;
    const limit = 10;

    let filter = {};

    if (status) filter.status = status;
    if (startDate) filter.date = { ...filter.date, $gte: new Date(startDate) };
    if (endDate) filter.date = { ...filter.date, $lte: new Date(endDate) };

    console.log('Admin appointments filter:', filter); // Debug log
    console.log('Search query:', search); // Debug log

    // Use aggregation pipeline for consistent structure (both search and non-search)
    let pipeline = [
      // Lookup user data
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      
      // Lookup provider data
      {
        $lookup: {
          from: 'providers',
          localField: 'provider',
          foreignField: '_id',
          as: 'providerData'
        }
      },
      
      // Lookup service data
      {
        $lookup: {
          from: 'services',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceData'
        }
      },
      
      // Unwind arrays
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$providerData', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$serviceData', preserveNullAndEmptyArrays: true } },
      
      // Apply filters
      { $match: filter }
    ];

    // If there's a search term, add search filter
    if (search) {
      pipeline.push({
        $match: {
          'serviceData.title': { $regex: search, $options: 'i' }
        }
      });
    }
    
    // Project the final structure
    pipeline.push({
      $project: {
        _id: 1,
        date: 1,
        status: 1,
        isCancelled: 1,
        createdAt: 1,
        updatedAt: 1,
        user: {
          _id: '$userData._id',
          name: '$userData.name',
          email: '$userData.email'
        },
        provider: {
          _id: '$providerData._id',
          name: '$providerData.name',
          email: '$providerData.email',
          contactInfo: '$providerData.contactInfo'
        },
        service: {
          _id: '$serviceData._id',
          title: '$serviceData.title',
          description: '$serviceData.description',
          price: '$serviceData.price'
        }
      }
    });

    // Get total count for pagination
    const countPipeline = [
      ...pipeline.slice(0, -1), // Remove the last project stage
      { $count: 'total' }
    ];

    const [results, totalResult] = await Promise.all([
      Appointment.aggregate([
        ...pipeline,
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $sort: { date: 1 } }
      ]),
      Appointment.aggregate(countPipeline)
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    console.log('Aggregation results:', results.length); // Debug log
    console.log('Sample result:', results[0]); // Debug log

    res.json({
      results,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Error in listAppointments:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};
exports.deleteAppointment = async (req, res, next) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    next(err);
  }
};

// Services
exports.listServices = async (req, res, next) => {
  try {
    const data = await paginate(Service, {}, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
exports.deleteService = async (req, res, next) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
}; 