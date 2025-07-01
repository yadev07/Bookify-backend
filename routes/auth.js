const express = require('express');
const router = express.Router();
const { registerUser, loginUser, registerProvider, loginProvider, loginAdmin } = require('../controllers/authController');

// User registration & login
router.post('/register', registerUser);
router.post('/login', loginUser);

// Provider registration & login
router.post('/provider/register', registerProvider);
router.post('/provider/login', loginProvider);

// Admin login
router.post('/admin/login', loginAdmin);

module.exports = router; 