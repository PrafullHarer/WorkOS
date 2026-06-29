import { useEffect, useState, useCallback } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { formatDate, getDaysInMonth, getFirstDayOfMonth, getWeekDates, isToday } from '../utils/dateHelpers';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import TaskSkeleton from '../components/TaskSkeleton';
import EmptyState from '../components/EmptyState';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const CalendarView = () => {
  const { tasks, occurrences, loading, fetchTasks, completeTask, completeOccurrence, skipOccurrence, deleteTask, fetchCategories } = useTaskContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'week' or 'month'
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = useCallback(async () => {
    const date = formatDate(currentDate);
    await fetchTasks({ date, view: viewMode });
    await fetchCategories();
  }, [currentDate, viewMode, fetchTasks, fetchCategories]);

  useEffect(() => { loadData(); }, [loadData]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') { d.setMonth(d.getMonth() + dir); }
    else { d.setDate(d.getDate() + dir * 7); }
    setCurrentDate(d);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const startOffset = (firstDay + 6) % 7; // Monday start

  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(formatDate(new Date(year, month, i)));

  const weekDates = getWeekDates(currentDate);
  const displayDates = viewMode === 'week' ? weekDates : calendarDays;

  // Get tasks for selected date
  const dayTasks = [
    ...tasks.filter(t => formatDate(t.dueDate) === selectedDate),
    ...occurrences.filter(o => o.date === selectedDate),
  ];

  const getTaskCount = (dateStr) => {
    if (!dateStr) return 0;
    return tasks.filter(t => formatDate(t.dueDate) === dateStr).length + occurrences.filter(o => o.date === dateStr).length;
  };

  const handleComplete = async (task) => {
    if (task.isOccurrence) await completeOccurrence(task._id || task.taskId, task.date);
    else await completeTask(task._id);
  };

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tight flex items-center gap-4">
            <CalendarDays className="w-10 h-10 text-black dark:text-white" /> Calendar
          </h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 p-1 bg-neutral-100 dark:bg-neutral-900 w-full sm:w-auto">
            {['week', 'month'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-4 py-2 text-sm font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex-1 sm:flex-initial text-center ${viewMode === v ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between card p-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-wide text-black dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="card p-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-mono font-black text-black/55 dark:text-white/55 py-2 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {displayDates.map((dateStr, idx) => {
              if (!dateStr) return <div key={`empty-${idx}`} className="h-16 lg:h-20" />;
              const day = new Date(dateStr + 'T12:00:00').getDate();
              const isSelected = dateStr === selectedDate;
              const isTodayDate = isToday(dateStr);
              const count = getTaskCount(dateStr);

              const cellDate = new Date(dateStr + 'T00:00:00');
              const todayDate = new Date();
              todayDate.setHours(0,0,0,0);
              const isPast = cellDate < todayDate;

              const dayItems = [
                ...tasks.filter(t => formatDate(t.dueDate) === dateStr),
                ...occurrences.filter(o => o.date === dateStr),
              ].filter(item => item.status !== 'skipped');

              let cellClass = `h-16 lg:h-20 flex flex-col items-center justify-center gap-1 transition-all duration-150 text-base font-black cursor-pointer border-2 ${isSelected ? 'ring-4 ring-yellow-450 dark:ring-yellow-400 z-10 border-black dark:border-white' : 'border-neutral-200 dark:border-neutral-800'} `;

              if (dayItems.length > 0) {
                const allDone = dayItems.every(item => item.status === 'done');
                if (allDone) {
                  cellClass += "bg-emerald-450 dark:bg-emerald-500 text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]";
                } else if (isPast) {
                  cellClass += "bg-red-400 dark:bg-red-500 text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]";
                } else {
                  if (isSelected) {
                    cellClass += "bg-black text-white dark:bg-white dark:text-black";
                  } else if (isTodayDate) {
                    cellClass += "bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800";
                  } else {
                    cellClass += "bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-250 dark:hover:bg-neutral-750";
                  }
                }
              } else {
                if (isSelected) {
                  cellClass += "bg-black text-white dark:bg-white dark:text-black";
                } else if (isTodayDate) {
                  cellClass += "bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800";
                } else {
                  cellClass += "bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-250 dark:hover:bg-neutral-750";
                }
              }

              return (
                <button key={dateStr} onClick={() => setSelectedDate(dateStr)} className={cellClass}>
                  <span>{day}</span>
                  {count > 0 && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-current" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Tasks */}
        <div>
          <h3 className="text-xl lg:text-2xl font-black uppercase tracking-wide text-black dark:text-white mb-5">
            Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          {loading ? <TaskSkeleton count={3} /> : dayTasks.length === 0 ? (
            <EmptyState title="No tasks" message="No tasks scheduled for this day" icon={CalendarDays} />
          ) : (
            <div className="space-y-3">
              {dayTasks.map((t, i) => (
                <TaskCard key={`${t._id}-${t.date || i}`} task={t} isOccurrence={!!t.isOccurrence}
                  onComplete={handleComplete} onDelete={(t) => deleteTask(t._id)}
                  onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
                  onSkip={t.isOccurrence ? (t) => skipOccurrence(t._id, t.date) : undefined} />
              ))}
            </div>
          )}
        </div>
        <TaskModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditTask(null); loadData(); }} editTask={editTask} />
      </div>
  );
};

export default CalendarView;
