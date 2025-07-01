const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true, index: true },
  profile: { type: String }, // Profile picture URL
  phone: { type: String },
  age: { type: Number, min: 0, max: 120 },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String }
  },
  role: { type: String, enum: ['user', 'provider'], default: 'user', index: true },
  isBlocked: { type: Boolean, default: false },
  profilePic: { type: String }, // Keeping for backward compatibility
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 