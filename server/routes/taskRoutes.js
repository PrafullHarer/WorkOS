const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/taskController');

// All routes require auth
router.use(authMiddleware);

router.get('/summary', getSummary);
router.get('/all', getAllTasks);
router.get('/', getTasks);
router.post('/', taskValidation, createTask);
router.patch('/bulk', bulkAction);
router.patch('/reorder', reorderTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/complete/:date', completeOccurrence);
router.patch('/:id/skip/:date', skipOccurrence);

module.exports = router;
