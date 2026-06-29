export const setupNotifications = () => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  return Notification.permission === 'granted';
};

export const scheduleNotification = (task, minutesBefore) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  if (!task.dueDate || !minutesBefore) return null;

  const dueTime = new Date(task.dueDate).getTime();
  const notifyTime = dueTime - minutesBefore * 60 * 1000;
  const now = Date.now();

  if (notifyTime <= now) return null;

  const timeout = setTimeout(() => {
    new Notification(`Task Reminder: ${task.title}`, {
      body: `Due in ${minutesBefore} minutes`,
      icon: '/vite.svg',
      tag: task._id,
    });
  }, notifyTime - now);

  return timeout;
};

export const exportToJSON = (tasks) => {
  const dataStr = JSON.stringify(tasks, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `taskmaste-export-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToCSV = (tasks) => {
  const headers = ['Title', 'Description', 'Type', 'Priority', 'Status', 'Due Date', 'Category', 'Tags', 'Created At'];
  const rows = tasks.map((task) => [
    `"${(task.title || '').replace(/"/g, '""')}"`,
    `"${(task.description || '').replace(/"/g, '""')}"`,
    task.type || '',
    task.priority || '',
    task.status || '',
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    task.category?.name || '',
    `"${(task.tags || []).join(', ')}"`,
    task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `taskmaste-export-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
