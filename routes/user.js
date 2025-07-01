const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const userController = require('../controllers/userController');
const upload = require('../middlewares/upload');

// Profile routes
router.get('/profile', auth(['user']), userController.getProfile);
router.put('/profile', auth(['user']), userController.updateProfile);

// Appointments
router.get('/appointments', auth(['user']), userController.getAppointments);
router.post('/appointments', auth(['user']), userController.bookAppointment);
router.delete('/appointments/:id', auth(['user']), userController.cancelAppointment);

// Get available time slots for a provider
router.get('/provider-slots', auth(['user']), userController.getProviderAvailableSlots);

// Dashboard
router.get('/dashboard', auth(['user']), userController.getDashboard);

router.post('/profile/picture', auth(['user']), upload.single('profilePic'), (req, res) => {
  // Controller logic will update user profilePic field
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  req.user.profilePic = `/uploads/${req.file.filename}`;
  req.user.save();
  res.json({ profilePic: req.user.profilePic });
});

module.exports = router; 