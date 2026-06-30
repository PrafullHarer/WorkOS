/**
 * Generates virtual task instances for repeating tasks within a date range.
 * Does NOT create database documents — instances are computed on-the-fly.
 */

const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Generate virtual task instances for a repeating task on a specific date range.
 * @param {Object} task - The repeating task document
 * @param {String} rangeStart - YYYY-MM-DD
 * @param {String} rangeEnd - YYYY-MM-DD
 * @returns {Array} Array of virtual task instances
 */
const generateOccurrences = (task, rangeStart, rangeEnd) => {
  if (task.type !== 'repeating' || !task.recurrence) return [];

  const taskStart = formatDate(task.recurrence.startDate);
  const taskEnd = task.recurrence.endDate
    ? formatDate(task.recurrence.endDate)
    : rangeEnd;

  // Clamp to the intersection of task range and requested range
  const effectiveStart = taskStart > rangeStart ? taskStart : rangeStart;
  const effectiveEnd = taskEnd < rangeEnd ? taskEnd : rangeEnd;

  if (effectiveStart > effectiveEnd) return [];

  const dates = getDatesBetween(effectiveStart, effectiveEnd);
  const completionsMap = {};
  const completionsCountMap = {};
  const completionsNoteMap = {};
  if (task.completions) {
    task.completions.forEach((c) => {
      completionsMap[c.date] = c.status;
      completionsCountMap[c.date] = c.count || 1;
      completionsNoteMap[c.date] = c.note || '';
    });
  }

  return dates.map((date) => ({
    _id: task._id,
    taskId: task._id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    type: 'repeating',
    priority: task.priority,
    category: task.category,
    tags: task.tags,
    recurrence: task.recurrence,
    reminderMinutes: task.reminderMinutes,
    order: task.order,
    date,
    status: completionsMap[date] || 'todo',
    count: completionsCountMap[date] || 0,
    note: completionsNoteMap[date] || '',
    targetCount: task.targetCount || 1,
    isOccurrence: true,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));
};

/**
 * Calculate the current streak for a repeating task (consecutive days completed ending today or yesterday).
 */
const calculateStreak = (task, clientDate) => {
  if (task.type !== 'repeating' || !task.completions) return 0;

  const completedDates = task.completions
    .filter((c) => c.status === 'done')
    .map((c) => c.date)
    .sort()
    .reverse();

  if (completedDates.length === 0) return 0;

  const todayRef = clientDate ? parseDate(clientDate) : new Date();
  const today = formatDate(todayRef);
  const yesterdayRef = new Date(todayRef);
  yesterdayRef.setDate(yesterdayRef.getDate() - 1);
  const yesterday = formatDate(yesterdayRef);

  // Streak must start from today or yesterday
  if (completedDates[0] !== today && completedDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const current = parseDate(completedDates[i - 1]);
    const prev = parseDate(completedDates[i]);
    const diffDays = (current - prev) / 86400000;

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Calculate weekly progress for a repeating task.
 * Returns how many days out of 7 (this week) the task was completed.
 */
const calculateWeeklyProgress = (task, clientDate) => {
  if (task.type !== 'repeating' || !task.completions) {
    return { completed: 0, total: 7 };
  }

  const today = clientDate ? parseDate(clientDate) : new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = formatDate(monday);
  const weekEnd = formatDate(sunday);

  const completed = task.completions.filter(
    (c) => c.status === 'done' && c.date >= weekStart && c.date <= weekEnd
  ).length;

  return { completed, total: 7 };
};

module.exports = {
  generateOccurrences,
  calculateStreak,
  calculateWeeklyProgress,
  formatDate,
  parseDate,
  getDatesBetween,
};
