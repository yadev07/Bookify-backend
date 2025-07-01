const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middlewares/auth');

// Public health route
router.get('/health', appointmentController.health);

// Protected routes
router.get('/', auth(['user', 'provider', 'admin']), appointmentController.getAppointments);
router.get('/:appointmentId', auth(['user', 'provider', 'admin']), appointmentController.getAppointmentById);
router.post('/', auth(['user']), appointmentController.createAppointment);
router.put('/:appointmentId/status', auth(['user', 'provider', 'admin']), appointmentController.updateAppointmentStatus);
router.delete('/:appointmentId', auth(['user', 'provider', 'admin']), appointmentController.deleteAppointment);

module.exports = router;