const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  isSuperAdmin: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema); 