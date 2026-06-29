const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  categoryValidation,
} = require('../controllers/categoryController');

// All routes require auth
router.use(authMiddleware);

router.get('/', getCategories);
router.post('/', categoryValidation, createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
