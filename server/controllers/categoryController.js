const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 50 }),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex code'),
];

// @desc    Get all categories for user
// @route   GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ userId: req.user._id }).sort({ name: 1 });
  res.json({ categories });
});

// @desc    Create a category
// @route   POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, color } = req.body;

  const category = await Category.create({
    userId: req.user._id,
    name,
    color: color || '#6366f1',
  });

  res.status(201).json({ category });
});

// @desc    Update a category
// @route   PUT /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!category) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  if (req.body.name) category.name = req.body.name;
  if (req.body.color) category.color = req.body.color;

  await category.save();
  res.json({ category });
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!category) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  // Remove category reference from tasks
  const Task = require('../models/Task');
  await Task.updateMany(
    { userId: req.user._id, category: req.params.id },
    { category: null }
  );

  res.json({ message: 'Category deleted.' });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  categoryValidation,
};
