const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const { isTimeSlotAvailable, validateTimeFormat, validateTimeRange } = require('../utils/timeSlotManager');

exports.health = (req, res) => {
  res.json({ status: 'ok' });
};

// Get All Appointments with Populated User, Provider, Service Details
exports.getAppointments = async (req, res) => {
  try {
    const { user, provider, status, date, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (user) filter.user = user;
    if (provider) filter.provider = provider;
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(filter)
      .populate('user', 'name email username phone')
      .populate('provider', 'name email username phone contactInfo')
      .populate('service', 'title description price duration')
      .sort({ date: 1, startTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Create new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { providerId, serviceId, date, startTime, endTime, notes } = req.body;
    const userId = req.user._id;

    // Validate time format
    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM format' });
    }
    
    // Validate time range
    if (!validateTimeRange(startTime, endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Validate service exists and belongs to provider
    const service = await Service.findOne({ _id: serviceId, provider: providerId });
    if (!service) {
      return res.status(400).json({ message: 'Service not found or does not belong to provider' });
    }

    // Check if appointment time is available
    const isAvailable = await isTimeSlotAvailable(providerId, date, startTime, endTime);
    if (!isAvailable) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    const appointment = await Appointment.create({
      user: userId,
      provider: providerId,
      service: serviceId,
      date: new Date(date),
      startTime,
      endTime,
      notes
    });

    await appointment.populate('user', 'name email username phone');
    await appointment.populate('provider', 'name email username phone contactInfo');
    await appointment.populate('service', 'title description price duration');

    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has permission to update this appointment
    if (req.user.role === 'user' && appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    if (req.user.role === 'provider' && appointment.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    appointment.status = status;
    if (status === 'cancelled') {
      appointment.isCancelled = true;
    }

    await appointment.save();
    await appointment.populate('user', 'name email username phone');
    await appointment.populate('provider', 'name email username phone contactInfo');
    await appointment.populate('service', 'title description price duration');

    res.json(appointment);
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has permission to delete this appointment
    if (req.user.role === 'user' && appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }

    if (req.user.role === 'provider' && appointment.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }

    await Appointment.findByIdAndDelete(appointmentId);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Get appointment by ID
exports.getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('user', 'name email username phone')
      .populate('provider', 'name email username phone contactInfo')
      .populate('service', 'title description price duration');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (err) {
    console.error('Error fetching appointment:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};
