const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const paginate = require('../utils/paginate');
const buildFilterQuery = require('../utils/filterQuery');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const { getAvailableTimeSlots } = require('../utils/timeSlotManager');
const bcrypt = require('bcryptjs');

// Get provider profile
exports.getProfile = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.user._id).select('-password');
    res.json(provider);
  } catch (err) {
    next(err);
  }
};

// Update provider profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      contactInfo, 
      password, 
      username, 
      profile, 
      phone, 
      dob, 
      gender, 
      address, 
      bio, 
      specialization, 
      experience, 
      available 
    } = req.body;
    
    const update = { 
      name, 
      email, 
      contactInfo, 
      username, 
      profile, 
      phone, 
      dob, 
      gender, 
      address, 
      bio, 
      specialization, 
      experience, 
      available 
    };
    
    // Check if username is being changed and if it's already taken
    if (username) {
      const existingProvider = await Provider.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      if (existingProvider) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }
    
    // Check if email is being changed and if it's already taken
    if (email) {
      const existingProvider = await Provider.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (existingProvider) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      update.password = hashedPassword;
    }
    const provider = await Provider.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json(provider);
  } catch (err) {
    next(err);
  }
};

// Get available time slots for a specific date
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date, serviceId } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    let serviceDuration = 60; // Default 1 hour
    
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service && service.duration) {
        serviceDuration = service.duration;
      }
    }
    
    const availableSlots = await getAvailableTimeSlots(req.user._id, date, serviceDuration);
    res.json({ availableSlots, date });
  } catch (err) {
    next(err);
  }
};

// Update availability schedule
exports.updateAvailability = async (req, res, next) => {
  try {
    const { available } = req.body;
    
    if (!available || typeof available !== 'object') {
      return res.status(400).json({ message: 'Invalid availability data' });
    }
    
    const provider = await Provider.findByIdAndUpdate(
      req.user._id, 
      { available }, 
      { new: true }
    ).select('-password');
    
    res.json(provider);
  } catch (err) {
    next(err);
  }
};

// Get provider services
exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ provider: req.user._id });
    res.json(services);
  } catch (err) {
    next(err);
  }
};

// Add service
exports.addService = async (req, res, next) => {
  try {
    const { title, description, price, duration, category } = req.body;
    const service = await Service.create({ provider: req.user._id, title, description, price, duration, category });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
};

// Update service
exports.updateService = async (req, res, next) => {
  try {
    const { title, description, price, duration, category } = req.body;
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, provider: req.user._id },
      { title, description, price, duration, category },
      { new: true }
    );
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (err) {
    next(err);
  }
};

// Delete service
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndDelete({ _id: req.params.id, provider: req.user._id });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
};

// Get provider appointments (with filters)
exports.getAppointments = async (req, res, next) => {
  try {
    const filter = buildFilterQuery({ ...req.query, provider: req.user._id });
    const data = await paginate(Appointment, filter, req.query, [
      { path: 'user', select: 'profilePic profile name email' }
    ]);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Confirm appointment
exports.confirmAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, provider: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    appointment.status = 'confirmed';
    await appointment.save();
    // Send email notifications
    try {
      const foundService = await Service.findById(appointment.service);
      const user = await User.findById(appointment.user);
      await sendEmail(
        user.email,
        'Appointment Confirmed',
        `Your appointment for ${foundService.title} on ${new Date(appointment.date).toLocaleString()} has been confirmed by the provider.`,
        `<p>Your appointment for <b>${foundService.title}</b> on <b>${new Date(appointment.date).toLocaleString()}</b> has been <b>confirmed</b> by the provider.</p>`
      );
    } catch (e) { /* ignore email errors */ }
    res.json({ message: 'Appointment confirmed' });
  } catch (err) {
    next(err);
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, provider: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    appointment.status = 'cancelled';
    appointment.isCancelled = true;
    await appointment.save();
    // Send email notifications
    try {
      const foundService = await Service.findById(appointment.service);
      const user = await User.findById(appointment.user);
      await sendEmail(
        user.email,
        'Appointment Cancelled',
        `Your appointment for ${foundService.title} on ${new Date(appointment.date).toLocaleString()} has been cancelled by the provider.`,
        `<p>Your appointment for <b>${foundService.title}</b> on <b>${new Date(appointment.date).toLocaleString()}</b> has been <b>cancelled</b> by the provider.</p>`
      );
    } catch (e) { /* ignore email errors */ }
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
};

// Provider dashboard summary
exports.getDashboard = async (req, res, next) => {
  try {
    const totalServices = await Service.countDocuments({ provider: req.user._id });
    const upcoming = await Appointment.countDocuments({ provider: req.user._id, status: 'upcoming' });
    const totalAppointments = await Appointment.countDocuments({ provider: req.user._id });
    res.json({ totalServices, upcoming, totalAppointments });
  } catch (err) {
    next(err);
  }
}; 

exports.getProviderAppointments = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { page = 1, status, search, startDate, endDate } = req.query;
    const limit = 10;

    let filter = { provider: providerId };

    if (status) filter.status = status;
    if (startDate) filter.date = { ...filter.date, $gte: new Date(startDate) };
    if (endDate) filter.date = { ...filter.date, $lte: new Date(endDate) };

    // If there's a search term, use aggregation pipeline
    if (search) {
      let pipeline = [
        // Match provider filter first
        { $match: { provider: providerId } },
        
        // Apply other filters
        { $match: filter },
        
        // Lookup user data
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
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
        { $unwind: { path: '$serviceData', preserveNullAndEmptyArrays: true } },
        
        // Search in service title
        {
          $match: {
            'serviceData.title': { $regex: search, $options: 'i' }
          }
        },
        
        // Project the final structure
        {
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
            service: {
              _id: '$serviceData._id',
              title: '$serviceData.title',
              description: '$serviceData.description',
              price: '$serviceData.price'
            }
          }
        }
      ];

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

      res.json({
        results,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    } else {
      // No search term, use aggregation pipeline for consistent structure
      let pipeline = [
        // Match provider filter first
        { $match: { provider: providerId } },
        
        // Apply other filters
        { $match: filter },
        
        // Lookup user data
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
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
        { $unwind: { path: '$serviceData', preserveNullAndEmptyArrays: true } },
        
        // Project the final structure
        {
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
            service: {
              _id: '$serviceData._id',
              title: '$serviceData.title',
              description: '$serviceData.description',
              price: '$serviceData.price'
            }
          }
        }
      ];

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

      res.json({
        results,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    }
  } catch (err) {
    console.error('Error fetching provider appointments:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};
