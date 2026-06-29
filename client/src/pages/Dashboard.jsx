import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../context/TaskContext';
import { useAuthContext } from '../context/AuthContext';
import { useDebounce } from '../hooks/useUtils';
import { formatDate, formatFullDate, isToday } from '../utils/dateHelpers';
import { setupNotifications, scheduleNotification } from '../utils/helpers';
import TaskCard from '../components/TaskCard';
import QuickAdd from '../components/QuickAdd';
import FilterBar from '../components/FilterBar';
import TaskModal from '../components/TaskModal';
import TaskSkeleton from '../components/TaskSkeleton';
import EmptyState from '../components/EmptyState';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Calendar, Sun } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { tasks, occurrences, repeatingTasks, loading, fetchTasks, fetchSummary, fetchCategories, summary,
    completeTask, completeOccurrence, skipOccurrence, deleteTask, updateTask, reorderTasks, bulkAction, selectedTasks, clearSelection } = useTaskContext();
  const { user } = useAuthContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const debouncedSearch = useDebounce(search, 300);

  const today = formatDate(new Date());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadData = useCallback(async () => {
    const params = { date: today, view: 'day', ...filters };
    if (debouncedSearch) params.search = debouncedSearch;
    await fetchTasks(params);
    await fetchSummary();
    await fetchCategories();
  }, [today, filters, debouncedSearch, fetchTasks, fetchSummary, fetchCategories]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setupNotifications();
    tasks.forEach(t => { if (t.reminderMinutes) scheduleNotification(t, t.reminderMinutes); });
  }, [tasks]);

  const allItems = [
    ...tasks.map(t => ({ ...t, isOccurrence: false })),
    ...occurrences.map(o => ({ ...o, isOccurrence: true })),
  ];

  const showCompleted = user?.preferences?.showCompleted !== false;
  const filteredItems = showCompleted ? allItems : allItems.filter(i => i.status !== 'done');

  const handleComplete = async (task) => {
    if (task.isOccurrence) { await completeOccurrence(task._id || task.taskId, task.date); }
    else { await completeTask(task._id); }
    await fetchSummary();
  };

  const handleEdit = (task) => { setEditTask(task); setModalOpen(true); };
  const handleDelete = async (task) => { await deleteTask(task._id || task.taskId); await fetchSummary(); };
  const handleSkip = async (task) => { await skipOccurrence(task._id || task.taskId, task.date); await fetchSummary(); };
  const handleIncrement = async (task) => { if (task.isOccurrence) { await completeOccurrence(task._id || task.taskId, task.date, true); await fetchSummary(); } };
  const handleInfo = (task) => {
    const taskId = task._id || task.taskId;
    navigate(`/tasks/${taskId}`);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filteredItems.findIndex(i => (i.isOccurrence ? `${i._id}-${i.date}` : i._id) === active.id);
    const newIdx = filteredItems.findIndex(i => (i.isOccurrence ? `${i._id}-${i.date}` : i._id) === over.id);
    const reordered = arrayMove(filteredItems, oldIdx, newIdx);
    const ids = reordered.filter(i => !i.isOccurrence).map(i => i._id);
    if (ids.length > 0) await reorderTasks(ids);
  };

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-5 h-5 text-black dark:text-white" />
              <span className="text-base text-black/55 dark:text-white/55 font-black uppercase tracking-wider">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tight">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}
            </h1>
          </div>
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-base text-black/55 dark:text-white/55 font-black uppercase tracking-wider">{selectedTasks.length} selected</span>
              <button onClick={() => bulkAction('done')} className="btn-primary text-sm py-2">Mark Done</button>
              <button onClick={() => bulkAction('delete')} className="btn-danger text-sm py-2">Delete</button>
              <button onClick={clearSelection} className="btn-secondary text-sm py-2">Clear</button>
            </div>
          )}
        </div>

        {/* Quick Add */}
        <QuickAdd onOpenModal={() => { setEditTask(null); setModalOpen(true); }} />

        {/* Filter Bar */}
        <FilterBar onSearchChange={setSearch} onFilterChange={setFilters} />

        {/* Task List */}
        <div>
          <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wide mb-5 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-black dark:text-white" /> Today's Tasks
            <span className="text-sm font-mono font-black text-black/50 dark:text-white/50">({filteredItems.length})</span>
          </h2>

          {loading ? (
            <TaskSkeleton />
          ) : filteredItems.length === 0 ? (
            <EmptyState title="No tasks for today" message="Add a task using the quick-add bar above or click 'New Task'" />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredItems.map(i => i.isOccurrence ? `${i._id}-${i.date}` : i._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <TaskCard key={item.isOccurrence ? `${item._id}-${item.date}` : item._id}
                      task={item} isOccurrence={item.isOccurrence}
                      onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} onSkip={item.isOccurrence ? handleSkip : undefined}
                      onIncrement={handleIncrement} onInfo={handleInfo} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      <TaskModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditTask(null); loadData(); }} editTask={editTask} />
    </div>
  );
};

export default Dashboard;
