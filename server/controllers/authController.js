const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} = require('../utils/tokenHelper');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// @desc    Register a new user
// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    passwordHash: password, // Will be hashed by pre-save hook
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  setTokenCookies(res, accessToken, refreshToken);

  res.status(201).json({
    user: user.toJSON(),
    message: 'Registration successful.',
  });
});

// @desc    Login user
// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  setTokenCookies(res, accessToken, refreshToken);

  res.json({
    user: user.toJSON(),
    message: 'Login successful.',
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    // Clear refresh token from DB
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
  }

  clearTokenCookies(res);

  res.json({ message: 'Logged out successfully.' });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: 'No refresh token.' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update refresh token
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      user: user.toJSON(),
      message: 'Token refreshed.',
    });
  } catch {
    clearTokenCookies(res);
    return res.status(401).json({ error: 'Invalid refresh token.' });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password, preferences } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (email) {
    const existing = await User.findOne({ email, _id: { $ne: user._id } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use.' });
    }
    user.email = email;
  }
  if (password) {
    user.passwordHash = password; // Will be hashed by pre-save hook
  }
  if (preferences) {
    if (preferences.defaultPriority !== undefined)
      user.preferences.defaultPriority = preferences.defaultPriority;
    if (preferences.showCompleted !== undefined)
      user.preferences.showCompleted = preferences.showCompleted;
    if (preferences.darkMode !== undefined)
      user.preferences.darkMode = preferences.darkMode;
  }

  await user.save();
  res.json({ user: user.toJSON(), message: 'Profile updated.' });
});

// @desc    Delete account
// @route   DELETE /api/auth/account
const deleteAccount = asyncHandler(async (req, res) => {
  const Task = require('../models/Task');
  const Category = require('../models/Category');

  await Task.deleteMany({ userId: req.user._id });
  await Category.deleteMany({ userId: req.user._id });
  await User.findByIdAndDelete(req.user._id);

  clearTokenCookies(res);
  res.json({ message: 'Account deleted successfully.' });
});

module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateProfile,
  deleteAccount,
  registerValidation,
  loginValidation,
};
