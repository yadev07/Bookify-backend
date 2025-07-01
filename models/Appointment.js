const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  date: { type: Date, required: true, index: true },
  startTime: { type: String, required: true }, // Format: "HH:MM"
  endTime: { type: String, required: true }, // Format: "HH:MM"
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled', 'confirmed'], default: 'upcoming', index: true },
  isCancelled: { type: Boolean, default: false },
  notes: { type: String }, // Additional notes for the appointment
}, { timestamps: true });

// Compound index to prevent double booking
appointmentSchema.index({ provider: 1, date: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema); 