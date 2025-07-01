const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Admin = require('../models/Admin');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// User registration
exports.registerUser = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      password, 
      username, 
      profile, 
      phone, 
      age, 
      gender, 
      address 
    } = req.body;
    
    // Check if user exists by email or username
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (userExists) {
      return res.status(400).json({ 
        message: userExists.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      username, 
      profile, 
      phone, 
      age, 
      gender, 
      address 
    });
    
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      token: generateToken(user._id),
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

// User login with username or email
exports.loginUser = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'Please provide username/email and password' });
    }
    
    // Find user by either username or email
    const user = await User.findOne({
      $or: [
        { email: usernameOrEmail },
        { username: usernameOrEmail }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      profile: user.profile,
      profilePic: user.profilePic,
      token: generateToken(user._id),
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

// Provider registration
exports.registerProvider = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      password, 
      username, 
      profile, 
      phone, 
      dob, 
      gender, 
      address, 
      bio, 
      specialization, 
      experience, 
      available 
    } = req.body;
    
    // Check if provider exists by email or username
    const providerExists = await Provider.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (providerExists) {
      return res.status(400).json({ 
        message: providerExists.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const provider = await Provider.create({ 
      name, 
      email, 
      password: hashedPassword, 
      username, 
      profile, 
      phone, 
      dob, 
      gender, 
      address, 
      bio, 
      specialization, 
      experience, 
      available 
    });
    
    res.status(201).json({
      _id: provider._id,
      name: provider.name,
      email: provider.email,
      username: provider.username,
      token: generateToken(provider._id),
      role: 'provider',
    });
  } catch (err) {
    next(err);
  }
};

// Provider login with username or email
exports.loginProvider = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'Please provide username/email and password' });
    }
    
    // Find provider by either username or email
    const provider = await Provider.findOne({
      $or: [
        { email: usernameOrEmail },
        { username: usernameOrEmail }
      ]
    });
    
    if (!provider) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }
    
    const isMatch = await bcrypt.compare(password, provider.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }
    
    res.json({
      _id: provider._id,
      name: provider.name,
      email: provider.email,
      username: provider.username,
      profile: provider.profile,
      profilePic: provider.profilePic,
      token: generateToken(provider._id),
      role: 'provider',
    });
  } catch (err) {
    next(err);
  }
};

// Admin login
exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    res.json({
      _id: admin._id,
      email: admin.email,
      token: generateToken(admin._id),
      role: 'admin',
    });
  } catch (err) {
    next(err);
  }
}; 