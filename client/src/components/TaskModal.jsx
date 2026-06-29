import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTaskContext } from '../context/TaskContext';
import { useAuthContext } from '../context/AuthContext';
import { X, Calendar, Tag, Repeat, Plus, Bell } from 'lucide-react';
import { formatDate } from '../utils/dateHelpers';

const TaskModal = ({ isOpen, onClose, editTask = null }) => {
  const { createTask, updateTask, categories, fetchTasks } = useTaskContext();
  const { user } = useAuthContext();
  const defPriority = user?.preferences?.defaultPriority || 'medium';

  const [form, setForm] = useState({
    title: editTask?.title || '',
    description: editTask?.description || '',
    type: editTask?.type || 'one-time',
    priority: editTask?.priority || defPriority,
    status: editTask?.status || 'todo',
    dueDate: editTask?.dueDate ? formatDate(new Date(editTask.dueDate)) : formatDate(new Date()),
    category: editTask?.category?._id || editTask?.category || '',
    tags: editTask?.tags?.join(', ') || '',
    recStartDate: editTask?.recurrence?.startDate ? formatDate(new Date(editTask.recurrence.startDate)) : formatDate(new Date()),
    recEndDate: editTask?.recurrence?.endDate ? formatDate(new Date(editTask.recurrence.endDate)) : '',
    reminderMinutes: editTask?.reminderMinutes || '',
    targetCount: editTask?.targetCount || 1,
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const taskData = {
        title: form.title, description: form.description, type: form.type,
        priority: form.priority, status: form.status, category: form.category || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        reminderMinutes: form.reminderMinutes ? Number(form.reminderMinutes) : null,
      };
      if (form.type === 'one-time') {
        taskData.dueDate = form.dueDate || null;
      } else {
        taskData.recurrence = { type: 'daily', startDate: form.recStartDate, endDate: form.recEndDate || undefined };
        taskData.targetCount = Number(form.targetCount) || 1;
      }
      if (editTask) { await updateTask(editTask._id, taskData); }
      else { await createTask(taskData); }
      await fetchTasks({ date: formatDate(new Date()), view: 'day' });
      onClose();
    } catch {} finally { setLoading(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content md:max-w-3xl !p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">{editTask ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer" id="close-task-modal"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Title, Description, Type & Dates */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Title</label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title..." className="input-field py-2.5 text-lg font-black" required autoFocus id="task-title-input" />
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add a description..." className="input-field resize-none h-28 text-base py-2" id="task-description-input" />
              </div>
              
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Task Type</label>
                <div className="flex items-center gap-2 p-1.5 bg-neutral-200 dark:bg-neutral-800">
                  {['one-time', 'repeating'].map(t => (
                    <button key={t} type="button" onClick={() => set('type', t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${form.type === t ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/55 dark:text-white/55'}`}>
                      {t === 'one-time' ? <Calendar className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                      {t === 'one-time' ? 'One-time' : 'Repeating'}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'one-time' ? (
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="input-field py-2.5 text-base" id="task-due-date" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Start Date</label>
                      <input type="date" value={form.recStartDate} onChange={e => set('recStartDate', e.target.value)} className="input-field py-2.5 text-base" required />
                    </div>
                    <div>
                      <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">End Date</label>
                      <input type="date" value={form.recEndDate} onChange={e => set('recEndDate', e.target.value)} className="input-field py-2.5 text-base" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Daily Target Count (e.g. 8 for water)</label>
                    <input type="number" min="1" value={form.targetCount} onChange={e => set('targetCount', e.target.value)} className="input-field py-2.5 text-base" placeholder="1" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Priority, Status, Category, Tags, Reminder */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input-field py-2.5 text-base cursor-pointer" id="task-priority-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field py-2.5 text-base cursor-pointer" id="task-status-select">
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                  <Tag className="w-4 h-4 inline mr-1.5" /> Category
                </label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field py-2.5 text-base cursor-pointer" id="task-category-select">
                  <option value="">No category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">Tags</label>
                <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Tags (comma separated)..." className="input-field py-2.5 text-base" id="task-tags-input" />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                  <Bell className="w-4 h-4 inline mr-1.5" /> Reminder
                </label>
                <select value={form.reminderMinutes} onChange={e => set('reminderMinutes', e.target.value)} className="input-field py-2.5 text-base cursor-pointer" id="task-reminder-select">
                  <option value="">No reminder</option>
                  <option value="0.166667">10 seconds</option>
                  <option value="5">5 min</option>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-black/10 dark:border-white/10">
            <button type="button" onClick={onClose} className="btn-secondary py-3 flex-1 text-base">Cancel</button>
            <button type="submit" disabled={loading || !form.title.trim()} className="btn-primary py-3 flex-1 flex items-center justify-center gap-2 text-base disabled:opacity-50" id="submit-task-btn">
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black dark:border-white/30 dark:border-t-white rounded-full animate-spin" />
              ) : (
                <><Plus className="w-4 h-4" />{editTask ? 'Update' : 'Create'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default TaskModal;
