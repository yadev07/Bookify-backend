const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true, index: true },
  profile: { type: String }, // Profile picture URL
  phone: { type: String },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'], required: true },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String }
  },
  bio: { type: String }, // Provider's bio
  specialization: { type: String },
  experience: { type: Number, min: 0 },
  available: {
    monday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } },
    tuesday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } },
    wednesday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } },
    thursday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } },
    friday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } },
    saturday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } },
    sunday: { start: { type: String }, end: { type: String }, isAvailable: { type: Boolean, default: true } }
  },
  contactInfo: { type: String }, // Keeping for backward compatibility
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  isBlocked: { type: Boolean, default: false, index: true },
  profilePic: { type: String }, // Keeping for backward compatibility
}, { timestamps: true });

module.exports = mongoose.model('Provider', providerSchema); 