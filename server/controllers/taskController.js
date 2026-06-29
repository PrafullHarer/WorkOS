const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const {
  generateOccurrences,
  calculateStreak,
  calculateWeeklyProgress,
  formatDate,
  getDatesBetween,
} = require('../utils/recurrenceHelper');

// Validation rules
const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('type').optional().isIn(['one-time', 'repeating']).withMessage('Invalid task type'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Invalid status'),
];

// @desc    Get tasks with date filtering and virtual occurrence generation
// @route   GET /api/tasks
const getTasks = asyncHandler(async (req, res) => {
  const { date, view = 'day', search, status, priority, category, startDate, endDate } = req.query;
  const userId = req.user._id;
  const clientDate = req.headers['x-client-date'] || formatDate(new Date());

  let rangeStart, rangeEnd;

  if (startDate && endDate) {
    rangeStart = startDate;
    rangeEnd = endDate;
  } else if (date) {
    const d = new Date(date);
    if (view === 'day') {
      rangeStart = formatDate(d);
      rangeEnd = formatDate(d);
    } else if (view === 'week') {
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      rangeStart = formatDate(monday);
      rangeEnd = formatDate(sunday);
    } else if (view === 'month') {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      rangeStart = formatDate(firstDay);
      rangeEnd = formatDate(lastDay);
    }
  } else {
    // Default: today
    rangeStart = clientDate;
    rangeEnd = clientDate;
  }

  // Build query for one-time tasks
  const oneTimeQuery = { userId, type: 'one-time' };

  if (rangeStart && rangeEnd) {
    oneTimeQuery.dueDate = {
      $gte: new Date(rangeStart),
      $lte: new Date(rangeEnd + 'T23:59:59.999Z'),
    };
  }

  if (status) oneTimeQuery.status = status;
  if (priority) oneTimeQuery.priority = priority;
  if (category) oneTimeQuery.category = category;
  if (search) {
    oneTimeQuery.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Fetch one-time tasks
  const oneTimeTasks = await Task.find(oneTimeQuery)
    .populate('category', 'name color')
    .sort({ order: 1, createdAt: -1 });

  // Fetch repeating tasks
  const repeatingQuery = { userId, type: 'repeating' };
  if (search) {
    repeatingQuery.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (priority) repeatingQuery.priority = priority;
  if (category) repeatingQuery.category = category;

  const repeatingTasks = await Task.find(repeatingQuery)
    .populate('category', 'name color')
    .sort({ order: 1, createdAt: -1 });

  // Generate occurrences for repeating tasks
  let occurrences = [];
  repeatingTasks.forEach((task) => {
    const taskOccurrences = generateOccurrences(task, rangeStart, rangeEnd);
    taskOccurrences.forEach((occ) => {
      occ.streak = calculateStreak(task, clientDate);
      occ.weeklyProgress = calculateWeeklyProgress(task, clientDate);
      if (task.category) {
        occ.category = task.category;
      }
    });
    if (status) {
      occurrences.push(...taskOccurrences.filter((o) => o.status === status));
    } else {
      occurrences.push(...taskOccurrences);
    }
  });

  // Add streak info to repeating parent tasks
  const repeatingWithStats = repeatingTasks.map((task) => {
    const t = task.toObject();
    t.streak = calculateStreak(task, clientDate);
    t.weeklyProgress = calculateWeeklyProgress(task, clientDate);
    return t;
  });

  res.json({
    tasks: oneTimeTasks,
    occurrences,
    repeatingTasks: repeatingWithStats,
    range: { start: rangeStart, end: rangeEnd },
  });
});

// @desc    Get all tasks (no date filter) for export
// @route   GET /api/tasks/all
const getAllTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ userId: req.user._id })
    .populate('category', 'name color')
    .sort({ createdAt: -1 });

  res.json({ tasks });
});

// @desc    Get dashboard summary
// @route   GET /api/tasks/summary
const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const clientDate = req.headers['x-client-date'] || formatDate(new Date());
  const today = clientDate;

  const totalTasks = await Task.countDocuments({ userId });
  const completedToday = await Task.countDocuments({
    userId,
    type: 'one-time',
    status: 'done',
    dueDate: {
      $gte: new Date(today),
      $lte: new Date(today + 'T23:59:59.999Z'),
    },
  });

  // Count repeating completions today
  const repeatingTasks = await Task.find({ userId, type: 'repeating' });
  let repeatingCompletedToday = 0;
  let activeStreaks = 0;

  repeatingTasks.forEach((task) => {
    const completion = task.completions.find((c) => c.date === today);
    if (completion && completion.status === 'done') {
      repeatingCompletedToday++;
    }
    const streak = calculateStreak(task, clientDate);
    if (streak > 0) activeStreaks++;
  });

  // Overdue count
  const overdueCount = await Task.countDocuments({
    userId,
    type: 'one-time',
    status: { $ne: 'done' },
    dueDate: { $lt: new Date(today) },
  });

  res.json({
    totalTasks,
    completedToday: completedToday + repeatingCompletedToday,
    activeStreaks,
    overdueCount,
  });
});

// @desc    Create a task
// @route   POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const taskData = {
    ...req.body,
    userId: req.user._id,
  };

  // Get max order for ordering
  const maxOrderTask = await Task.findOne({ userId: req.user._id }).sort({ order: -1 });
  taskData.order = maxOrderTask ? maxOrderTask.order + 1 : 0;

  const task = await Task.create(taskData);
  const populated = await task.populate('category', 'name color');

  res.status(201).json({ task: populated });
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const allowedFields = [
    'title', 'description', 'type', 'priority', 'status', 'dueDate',
    'category', 'tags', 'recurrence', 'reminderMinutes', 'order', 'targetCount',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  await task.save();
  const populated = await task.populate('category', 'name color');

  res.json({ task: populated });
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  res.json({ message: 'Task deleted.' });
});

// @desc    Complete a one-time task
// @route   PATCH /api/tasks/:id/complete
const completeTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (task.type !== 'one-time') {
    return res.status(400).json({ error: 'Use date-specific endpoint for repeating tasks.' });
  }

  task.status = task.status === 'done' ? 'todo' : 'done';
  await task.save();
  const populated = await task.populate('category', 'name color');

  res.json({ task: populated });
});

// @desc    Complete a specific day of a repeating task
// @route   PATCH /api/tasks/:id/complete/:date
const completeOccurrence = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (task.type !== 'repeating') {
    return res.status(400).json({ error: 'Task is not a repeating task.' });
  }

  // Validate that the date is within the past 5 days and not in the future
  const cellDate = new Date(date + 'T12:00:00');
  const todayDate = new Date();
  todayDate.setHours(23, 59, 59, 999);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  if (cellDate < fiveDaysAgo || cellDate > todayDate) {
    return res.status(400).json({ error: 'Completions can only be edited for today and the past 5 days.' });
  }

  // Toggle completion, increment progress, or clear progress
  const existingIndex = task.completions.findIndex((c) => c.date === date);
  const isIncrement = req.query.increment === 'true';
  const isClear = req.query.clear === 'true';

  if (isClear) {
    if (existingIndex >= 0) {
      task.completions.splice(existingIndex, 1);
    }
  } else if (isIncrement && task.targetCount > 1) {
    if (existingIndex >= 0) {
      const currentCount = task.completions[existingIndex].count || 1;
      if (currentCount < task.targetCount) {
        task.completions[existingIndex].count = currentCount + 1;
        if (task.completions[existingIndex].count >= task.targetCount) {
          task.completions[existingIndex].status = 'done';
        } else {
          task.completions[existingIndex].status = 'todo';
        }
      }
    } else {
      task.completions.push({ date, status: task.targetCount <= 1 ? 'done' : 'todo', count: 1 });
    }
  } else {
    if (existingIndex >= 0) {
      if (task.completions[existingIndex].status === 'done') {
        task.completions.splice(existingIndex, 1);
      } else {
        task.completions[existingIndex].status = 'done';
        task.completions[existingIndex].count = task.targetCount || 1;
      }
    } else {
      task.completions.push({ date, status: 'done', count: task.targetCount || 1 });
    }
  }

  await task.save();
  const populated = await task.populate('category', 'name color');
  const clientDate = req.headers['x-client-date'] || formatDate(new Date());

  res.json({
    task: populated,
    streak: calculateStreak(task, clientDate),
    weeklyProgress: calculateWeeklyProgress(task, clientDate),
  });
});

// @desc    Skip a specific day of a repeating task
// @route   PATCH /api/tasks/:id/skip/:date
const skipOccurrence = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (task.type !== 'repeating') {
    return res.status(400).json({ error: 'Task is not a repeating task.' });
  }

  // Validate that the date is within the past 5 days and not in the future
  const cellDate = new Date(date + 'T12:00:00');
  const todayDate = new Date();
  todayDate.setHours(23, 59, 59, 999);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  if (cellDate < fiveDaysAgo || cellDate > todayDate) {
    return res.status(400).json({ error: 'Completions can only be edited for today and the past 5 days.' });
  }

  const existingIndex = task.completions.findIndex((c) => c.date === date);
  if (existingIndex >= 0) {
    task.completions[existingIndex].status = 'skipped';
  } else {
    task.completions.push({ date, status: 'skipped' });
  }

  await task.save();
  const populated = await task.populate('category', 'name color');
  const clientDate = req.headers['x-client-date'] || formatDate(new Date());

  res.json({
    task: populated,
    streak: calculateStreak(task, clientDate),
    weeklyProgress: calculateWeeklyProgress(task, clientDate),
  });
});

// @desc    Bulk update tasks (mark done / delete)
// @route   PATCH /api/tasks/bulk
const bulkAction = asyncHandler(async (req, res) => {
  const { taskIds, action } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: 'Task IDs are required.' });
  }

  if (action === 'done') {
    await Task.updateMany(
      { _id: { $in: taskIds }, userId: req.user._id, type: 'one-time' },
      { status: 'done' }
    );
    res.json({ message: `${taskIds.length} tasks marked as done.` });
  } else if (action === 'delete') {
    await Task.deleteMany({ _id: { $in: taskIds }, userId: req.user._id });
    res.json({ message: `${taskIds.length} tasks deleted.` });
  } else {
    res.status(400).json({ error: 'Invalid action. Use "done" or "delete".' });
  }
});

// @desc    Reorder tasks
// @route   PATCH /api/tasks/reorder
const reorderTasks = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'Ordered task IDs are required.' });
  }

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, userId: req.user._id },
      update: { order: index },
    },
  }));

  await Task.bulkWrite(bulkOps);
  res.json({ message: 'Tasks reordered.' });
});

// @desc    Get a single task by ID
// @route   GET /api/tasks/:id
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('category', 'name color');

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const clientDate = req.headers['x-client-date'] || formatDate(new Date());

  res.json({
    task,
    streak: task.type === 'repeating' ? calculateStreak(task, clientDate) : 0,
    weeklyProgress: task.type === 'repeating' ? calculateWeeklyProgress(task, clientDate) : 0
  });
});

module.exports = {
  getTasks,
  getAllTasks,
  getSummary,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  completeOccurrence,
  skipOccurrence,
  bulkAction,
  reorderTasks,
  taskValidation,
  getTaskById,
};
