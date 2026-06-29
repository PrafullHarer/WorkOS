import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

const QuickAdd = ({ onOpenModal }) => {
  const [title, setTitle] = useState('');
  const { createTask, fetchTasks } = useTaskContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createTask({ title: title.trim(), type: 'one-time', priority: 'medium', dueDate: new Date().toISOString().split('T')[0] });
      setTitle('');
      await fetchTasks({ date: new Date().toISOString().split('T')[0], view: 'day' });
    } catch {}
  };

  return (
    <div className="card p-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <div className="flex-1 relative w-full">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Quick add a task..." className="input-field pr-10" id="quick-add-input" />
          {title.trim() && (
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-all duration-150 cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="button" onClick={onOpenModal} className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer w-full sm:w-auto" id="open-task-modal-btn">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </form>
    </div>
  );
};

export default QuickAdd;
