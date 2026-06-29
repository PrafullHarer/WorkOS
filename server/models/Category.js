const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'],
      default: '#6366f1',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique category names per user
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
