const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Public: Browse all services
router.get('/', serviceController.listServices);

// Public: Search services
router.get('/search', serviceController.searchServices);

module.exports = router; 