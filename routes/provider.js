const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const providerController = require('../controllers/providerController');
const upload = require('../middlewares/upload');
const { getAvailableTimeSlots } = require('../utils/timeSlotManager');

// Public routes (no authentication required)
router.get('/public/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const provider = await require('../models/Provider').findById(providerId)
      .select('-password -isBlocked')
      .populate('services', 'title description price duration');
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

router.get('/public/:providerId/available-slots', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date, serviceId } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    let serviceDuration = 60; // Default 1 hour
    
    if (serviceId) {
      const service = await require('../models/Service').findById(serviceId);
      if (service && service.duration) {
        serviceDuration = service.duration;
      }
    }
    
    const availableSlots = await getAvailableTimeSlots(providerId, date, serviceDuration);
    res.json({ availableSlots, date, providerId });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Profile routes
router.get('/profile', auth(['provider']), providerController.getProfile);
router.put('/profile', auth(['provider']), providerController.updateProfile);
router.post('/profile/picture', auth(['provider']), upload.single('profilePic'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  req.user.profilePic = `/uploads/${req.file.filename}`;
  req.user.save();
  res.json({ profilePic: req.user.profilePic });
});

// Availability management
router.get('/available-slots', auth(['provider']), providerController.getAvailableSlots);
router.put('/availability', auth(['provider']), providerController.updateAvailability);

// Services
router.get('/services', auth(['provider']), providerController.getServices);
router.post('/services', auth(['provider']), providerController.addService);
router.put('/services/:id', auth(['provider']), providerController.updateService);
router.delete('/services/:id', auth(['provider']), providerController.deleteService);

// Appointments
router.get('/appointments', auth(['provider']), providerController.getProviderAppointments);
router.put('/appointments/:id/confirm', auth(['provider']), providerController.confirmAppointment);
router.put('/appointments/:id/cancel', auth(['provider']), providerController.cancelAppointment);

// Dashboard
router.get('/dashboard', auth(['provider']), providerController.getDashboard);

module.exports = router; 