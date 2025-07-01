const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Admin = require('../models/Admin');

const auth = (roles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.includes('admin')) {
        const admin = await Admin.findById(decoded.id);
        if (!admin) return res.status(401).json({ message: 'Admin not found' });
        req.admin = admin;
      } else if (roles.includes('provider')) {
        const provider = await Provider.findById(decoded.id);
        if (!provider) return res.status(401).json({ message: 'Provider not found' });
        if (provider.isBlocked) return res.status(403).json({ message: 'Account is blocked' });
        req.user = provider;
      } else {
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: 'User not found' });
        if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked' });
        req.user = user;
      }
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
  };
};

module.exports = auth; 