const Service = require('../models/Service');
const paginate = require('../utils/paginate');

// List all services (public)
exports.listServices = async (req, res, next) => {
  try {
    const data = await paginate(Service, {}, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Search services (public)
exports.searchServices = async (req, res, next) => {
  try {
    const { q, provider } = req.query;
    const filter = {};
    if (q) filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
    if (provider) filter.provider = provider;
    const data = await paginate(Service, filter, req.query, [
      { path: 'provider', select: 'profilePic profile name address' }
    ]);
    res.json(data);
  } catch (err) {
    next(err);
  }
}; 