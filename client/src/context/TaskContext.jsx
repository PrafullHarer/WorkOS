import { createContext, useContext, useState, useCallback } from 'react';
import { taskAPI, categoryAPI } from '../api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/helpers';

const TaskContext = createContext(null);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTaskContext must be used within TaskProvider');
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [repeatingTasks, setRepeatingTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);

  const fetchTasks = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await taskAPI.getTasks(params);
      setTasks(data.tasks || []);
      setOccurrences(data.occurrences || []);
      setRepeatingTasks(data.repeatingTasks || []);
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch tasks'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await taskAPI.getSummary();
      setSummary(data);
      return data;
    } catch {
      // Silently fail
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await categoryAPI.getCategories();
      setCategories(data.categories || []);
      return data.categories;
    } catch {
      // Silently fail
    }
  }, []);

  const createTask = async (taskData) => {
    try {
      const { data } = await taskAPI.createTask(taskData);
      toast.success('Task created!');
      return data.task;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'));
      throw err;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      const { data } = await taskAPI.updateTask(id, taskData);
      setTasks((prev) => prev.map((t) => (t._id === id ? data.task : t)));
      toast.success('Task updated!');
      return data.task;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task'));
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      setOccurrences((prev) => prev.filter((o) => o.taskId !== id));
      toast.success('Task deleted!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete task'));
    }
  };

  const completeTask = async (id) => {
    try {
      const { data } = await taskAPI.completeTask(id);
      setTasks((prev) => prev.map((t) => (t._id === id ? data.task : t)));
      return data.task;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete task'));
    }
  };

  const completeOccurrence = async (id, date, increment = false, clear = false) => {
    try {
      const { data } = await taskAPI.completeOccurrence(id, date, increment, clear);
      const completion = data.task.completions.find(c => c.date === date);
      const newStatus = completion ? completion.status : 'todo';
      const newCount = completion ? (completion.count !== undefined ? completion.count : 1) : 0;

      setOccurrences((prev) =>
        prev.map((o) =>
          o.taskId.toString() === id.toString()
            ? {
                ...o,
                ...(o.date === date ? { status: newStatus, count: newCount } : {}),
                streak: data.streak,
                weeklyProgress: data.weeklyProgress,
              }
            : o
        )
      );
      setRepeatingTasks((prev) =>
        prev.map((t) =>
          t._id.toString() === id.toString()
            ? { ...t, completions: data.task.completions, streak: data.streak, weeklyProgress: data.weeklyProgress }
            : t
        )
      );
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete occurrence'));
    }
  };

  const skipOccurrence = async (id, date) => {
    try {
      const { data } = await taskAPI.skipOccurrence(id, date);
      setOccurrences((prev) =>
        prev.map((o) =>
          o.taskId.toString() === id.toString()
            ? {
                ...o,
                ...(o.date === date ? { status: 'skipped' } : {}),
                streak: data.streak,
                weeklyProgress: data.weeklyProgress,
              }
            : o
        )
      );
      setRepeatingTasks((prev) =>
        prev.map((t) =>
          t._id.toString() === id.toString()
            ? { ...t, completions: data.task.completions, streak: data.streak, weeklyProgress: data.weeklyProgress }
            : t
        )
      );
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to skip occurrence'));
    }
  };

  const updateOccurrenceNote = async (id, date, note) => {
    try {
      const { data } = await taskAPI.updateOccurrenceNote(id, date, note);
      const completion = data.task.completions.find(c => c.date === date);
      const newStatus = completion ? completion.status : 'todo';
      const newCount = completion ? (completion.count !== undefined ? completion.count : 1) : 0;
      const newNote = completion ? completion.note : '';

      setOccurrences((prev) =>
        prev.map((o) =>
          o.taskId.toString() === id.toString()
            ? {
                ...o,
                ...(o.date === date ? { status: newStatus, count: newCount, note: newNote } : {}),
                streak: data.streak,
                weeklyProgress: data.weeklyProgress,
              }
            : o
        )
      );
      setRepeatingTasks((prev) =>
        prev.map((t) =>
          t._id.toString() === id.toString()
            ? { ...t, completions: data.task.completions, streak: data.streak, weeklyProgress: data.weeklyProgress }
            : t
        )
      );
      toast.success('Note updated!');
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update note'));
    }
  };

  const bulkAction = async (action) => {
    if (selectedTasks.length === 0) {
      toast.error('No tasks selected');
      return;
    }
    try {
      await taskAPI.bulkAction({ taskIds: selectedTasks, action });
      if (action === 'done') {
        setTasks((prev) =>
          prev.map((t) =>
            selectedTasks.includes(t._id) ? { ...t, status: 'done' } : t
          )
        );
        toast.success(`${selectedTasks.length} tasks marked as done`);
      } else if (action === 'delete') {
        setTasks((prev) => prev.filter((t) => !selectedTasks.includes(t._id)));
        toast.success(`${selectedTasks.length} tasks deleted`);
      }
      setSelectedTasks([]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Bulk action failed'));
    }
  };

  const reorderTasks = async (orderedIds) => {
    try {
      await taskAPI.reorderTasks(orderedIds);
    } catch {
      toast.error('Failed to reorder tasks');
    }
  };

  const createCategory = async (categoryData) => {
    try {
      const { data } = await categoryAPI.createCategory(categoryData);
      setCategories((prev) => [...prev, data.category]);
      toast.success('Category created!');
      return data.category;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create category'));
      throw err;
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const { data } = await categoryAPI.updateCategory(id, categoryData);
      setCategories((prev) => prev.map((c) => (c._id === id ? data.category : c)));
      toast.success('Category updated!');
      return data.category;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update category'));
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      await categoryAPI.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
      toast.success('Category deleted!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const clearSelection = () => setSelectedTasks([]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        occurrences,
        repeatingTasks,
        categories,
        summary,
        loading,
        selectedTasks,
        fetchTasks,
        fetchSummary,
        fetchCategories,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        completeOccurrence,
        skipOccurrence,
        updateOccurrenceNote,
        bulkAction,
        reorderTasks,
        createCategory,
        updateCategory,
        deleteCategory,
        toggleTaskSelection,
        clearSelection,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
