const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

// Dashboard
router.get('/dashboard', auth(['admin']), adminController.getDashboard);

// Users
router.get('/user', auth(['admin']), adminController.listUsers);
router.put('/user/:id/block', auth(['admin']), adminController.blockUser);
router.put('/user/:id/unblock', auth(['admin']), adminController.unblockUser);
router.delete('/user/:id', auth(['admin']), adminController.deleteUser);

// Providers
router.get('/providers', auth(['admin']), adminController.listProviders);
router.put('/providers/:id/block', auth(['admin']), adminController.blockProvider);
router.put('/providers/:id/unblock', auth(['admin']), adminController.unblockProvider);
router.delete('/providers/:id', auth(['admin']), adminController.deleteProvider);

// Appointments
router.get('/appointments', auth(['admin']), adminController.listAppointments);
router.delete('/appointments/:id', auth(['admin']), adminController.deleteAppointment);

// Services
router.get('/services', auth(['admin']), adminController.listServices);
router.delete('/services/:id', auth(['admin']), adminController.deleteService);

module.exports = router; 