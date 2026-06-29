import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../context/TaskContext';
import { formatDate, getRelativeDay } from '../utils/dateHelpers';
import TaskCard from '../components/TaskCard';
import TaskSkeleton from '../components/TaskSkeleton';
import EmptyState from '../components/EmptyState';
import { Clock } from 'lucide-react';

const Upcoming = () => {
  const navigate = useNavigate();
  const { tasks, occurrences, repeatingTasks, loading, fetchTasks, completeTask, completeOccurrence, skipOccurrence, deleteTask, fetchCategories } = useTaskContext();

  const today = formatDate(new Date());
  const endDate = formatDate(new Date(Date.now() + 6 * 86400000));

  const loadData = useCallback(async () => {
    await fetchTasks({ startDate: today, endDate, view: 'week' });
    await fetchCategories();
  }, [today, endDate, fetchTasks, fetchCategories]);

  useEffect(() => { loadData(); }, [loadData]);

  // Group by date
  const grouped = {};
  tasks.forEach(t => {
    const d = formatDate(t.dueDate);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push({ ...t, isOccurrence: false });
  });
  occurrences.forEach(o => {
    if (!grouped[o.date]) grouped[o.date] = [];
    grouped[o.date].push({ ...o, isOccurrence: true });
  });

  const sortedDates = Object.keys(grouped).sort();

  const handleComplete = async (task) => {
    if (task.isOccurrence) await completeOccurrence(task._id || task.taskId, task.date);
    else await completeTask(task._id);
  };

  const handleIncrement = async (task) => {
    if (task.isOccurrence) {
      await completeOccurrence(task._id || task.taskId, task.date, true);
    }
  };

  const handleInfo = (task) => {
    const taskId = task._id || task.taskId;
    navigate(`/tasks/${taskId}`);
  };

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tight flex items-center gap-4">
          <Clock className="w-10 h-10 text-black dark:text-white" /> Upcoming
        </h1>

        {loading ? <TaskSkeleton count={8} /> : sortedDates.length === 0 ? (
          <EmptyState title="All clear!" message="No upcoming tasks for the next 7 days" icon={Clock} />
        ) : (
          sortedDates.map(date => (
            <div key={date} className="animate-slide-up">
              <h2 className="text-lg lg:text-xl font-black uppercase tracking-wide text-black dark:text-white mb-4 flex items-center gap-3">
                <div className="w-3 h-3 bg-black dark:bg-white flex-shrink-0" />
                {getRelativeDay(date)}
                <span className="text-sm font-mono font-black text-black/50 dark:text-white/50">({grouped[date].length})</span>
              </h2>
              <div className="space-y-3 ml-5 pl-4">
                {grouped[date].map((t, i) => (
                  <TaskCard key={`${t._id}-${t.date || i}`} task={t} isOccurrence={t.isOccurrence}
                    onComplete={handleComplete} onDelete={(t) => deleteTask(t._id)}
                    onEdit={() => {}} onSkip={t.isOccurrence ? (t) => skipOccurrence(t._id, t.date) : undefined}
                    onIncrement={handleIncrement} onInfo={handleInfo} />
                ))}
              </div>
            </div>
          ))
        )}
    </div>
  );
};

export default Upcoming;
