const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    status: {
      type: String,
      enum: ['done', 'skipped', 'todo'],
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: ['one-time', 'repeating'],
      default: 'one-time',
    },
    targetCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    recurrence: {
      type: {
        type: String,
        enum: ['daily'],
      },
      startDate: Date,
      endDate: Date,
    },
    completions: {
      type: [completionSchema],
      default: [],
    },
    reminderMinutes: {
      type: Number,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
taskSchema.index({ userId: 1, type: 1, dueDate: 1 });
taskSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Task', taskSchema);
