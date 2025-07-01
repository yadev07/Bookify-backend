const Appointment = require('../models/Appointment');

// Helper: Convert HH:MM to minutes
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes to HH:MM
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Validate time format (HH:MM)
function validateTimeFormat(timeStr) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

// Validate time range
function validateTimeRange(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return endMinutes > startMinutes;
}

// Check if a time range is available for booking (no overlap with existing appointments)
exports.isTimeRangeAvailable = async (providerId, date, startTime, endTime, excludeAppointmentId = null) => {
  try {
    // Convert date to start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find conflicting appointments
    const conflictingAppointments = await Appointment.find({
      provider: providerId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['upcoming', 'confirmed'] },
      _id: { $ne: excludeAppointmentId },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });
    return conflictingAppointments.length === 0;
  } catch (err) {
    return false;
  }
};

exports.validateTimeFormat = validateTimeFormat;
exports.validateTimeRange = validateTimeRange; 