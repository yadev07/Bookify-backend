const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Provider = require('../models/Provider');
const paginate = require('../utils/paginate');
const buildFilterQuery = require('../utils/filterQuery');
const sendEmail = require('../utils/sendEmail');
const { isTimeSlotAvailable, validateTimeFormat, validateTimeRange, isTimeRangeAvailable } = require('../utils/timeSlotManager');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      password, 
      username, 
      profile, 
      phone, 
      age, 
      gender, 
      address 
    } = req.body;
    
    const update = { 
      name, 
      email, 
      username, 
      profile, 
      phone, 
      age, 
      gender, 
      address 
    };
    
    // Check if username is being changed and if it's already taken
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }
    
    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      update.password = hashedPassword;
    }
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Get user appointments (with filters)
exports.getAppointments = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, status, search, startDate, endDate } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    let filter = { user: userId };

    if (status) filter.status = status;
    if (startDate) filter.date = { ...filter.date, $gte: new Date(startDate) };
    if (endDate) filter.date = { ...filter.date, $lte: new Date(endDate) };

    // If there's a search term, use aggregation pipeline
    if (search) {
      let pipeline = [
        // Match user filter first
        { $match: { user: userId } },
        
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
        { $unwind: { path: '$providerData', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$serviceData', preserveNullAndEmptyArrays: true } },
        
        // Search in service title
        {
          $match: {
            'serviceData.title': { $regex: search, $options: 'i' }
          }
        },
        
        // Apply other filters
        { $match: filter },
        
        // Project the final structure
        {
          $project: {
            _id: 1,
            date: 1,
            status: 1,
            isCancelled: 1,
            createdAt: 1,
            updatedAt: 1,
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
          { $skip: skip },
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
      // No search term, use simple populate
      const total = await Appointment.countDocuments(filter);

      const appointments = await Appointment.find(filter)
        .populate('provider', 'name email contactInfo')
        .populate('service', 'title description price')
        .skip(skip)
        .limit(limit)
        .sort({ date: 1 });

      res.json({
        results: appointments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    }
  } catch (err) {
    next(err);
  }
};

// Book an appointment
exports.bookAppointment = async (req, res) => {
  try {
    const { provider, service, date, startTime, endTime } = req.body;
    if (!provider || !service || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // Check for time overlap
    const available = await isTimeRangeAvailable(provider, date, startTime, endTime);
    if (!available) {
      return res.status(409).json({ message: 'This time range is not available' });
    }
    const appointment = await Appointment.create({
      user: req.user._id,
      provider,
      service,
      date,
      startTime,
      endTime,
      status: 'upcoming',
    });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    appointment.status = 'cancelled';
    appointment.isCancelled = true;
    await appointment.save();
    // Send email notifications
    try {
      const foundService = await Service.findById(appointment.service);
      const foundProvider = await Provider.findById(appointment.provider);
      await sendEmail(
        req.user.email,
        'Appointment Cancelled',
        `Your appointment for ${foundService.title} on ${new Date(appointment.date).toLocaleString()} has been cancelled.`,
        `<p>Your appointment for <b>${foundService.title}</b> on <b>${new Date(appointment.date).toLocaleString()}</b> has been cancelled.</p>`
      );
      await sendEmail(
        foundProvider.email,
        'Appointment Cancelled',
        `The appointment for ${foundService.title} by ${req.user.name} on ${new Date(appointment.date).toLocaleString()} has been cancelled.`,
        `<p>The appointment for <b>${foundService.title}</b> by <b>${req.user.name}</b> on <b>${new Date(appointment.date).toLocaleString()}</b> has been cancelled.</p>`
      );
    } catch (e) { /* ignore email errors */ }
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
};

// User dashboard summary
exports.getDashboard = async (req, res, next) => {
  try {
    const totalAppointments = await Appointment.countDocuments({ user: req.user._id });
    const upcoming = await Appointment.countDocuments({ user: req.user._id, status: 'upcoming' });
    const completed = await Appointment.countDocuments({ user: req.user._id, status: 'completed' });
    res.json({ totalAppointments, upcoming, completed });
  } catch (err) {
    next(err);
  }
};

// Get available time slots for a provider
exports.getProviderAvailableSlots = async (req, res, next) => {
  try {
    const { providerId, date, serviceId } = req.query;
    
    if (!providerId || !date) {
      return res.status(400).json({ message: 'Provider ID and date are required' });
    }
    
    let serviceDuration = 60; // Default 1 hour
    
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service && service.duration) {
        serviceDuration = service.duration;
      }
    }
    
    const availableSlots = await getAvailableTimeSlots(providerId, date, serviceDuration);
    res.json({ availableSlots, date, providerId });
  } catch (err) {
    next(err);
  }
}; 