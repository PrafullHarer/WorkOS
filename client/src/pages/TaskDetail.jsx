import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Flame, CheckCircle2, Activity, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react';
import { formatDate, getDaysInMonth, getFirstDayOfMonth } from '../utils/dateHelpers';
import { useTaskContext } from '../context/TaskContext';
import { taskAPI } from '../api';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { completeOccurrence, skipOccurrence, updateOccurrenceNote } = useTaskContext();

  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDayMenu, setSelectedDayMenu] = useState(null);
  const [selectedDayNote, setSelectedDayNote] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  const loadTask = useCallback(async () => {
    setLoadingTask(true);
    try {
      const { data } = await taskAPI.getTaskById(id);
      setTask({ ...data.task, streak: data.streak, weeklyProgress: data.weeklyProgress });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load task details');
    } finally {
      setLoadingTask(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
    const todayDate = new Date();
    setCurrentMonth(todayDate.getMonth());
    setCurrentYear(todayDate.getFullYear());
    setSelectedDayMenu(null);
    setSelectedDayNote(null);
  }, [loadTask]);

  // Sync note input when selection changes
  useEffect(() => {
    if (selectedDayNote) {
      const comp = (task?.completions || []).find(c => c.date === selectedDayNote.dateStr);
      setNoteInput(comp?.note || '');
    } else {
      setNoteInput('');
    }
  }, [selectedDayNote, task?.completions]);

  const handleSaveNote = async (noteVal) => {
    if (!selectedDayNote || !task) return;
    try {
      const res = await updateOccurrenceNote(task._id, selectedDayNote.dateStr, noteVal);
      if (res?.task) {
        setTask({ ...res.task, streak: res.streak, weeklyProgress: res.weeklyProgress });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingTask) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-none animate-spin" />
          <p className="text-black/60 dark:text-white/60 font-mono text-xs uppercase font-black tracking-wider animate-pulse">Loading Details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase">Task Not Found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-primary py-2 px-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  const handleCellAction = async (action, dateStr, e) => {
    if (e) e.stopPropagation();
    setSelectedDayMenu(null);
    try {
      let res;
      if (action === 'complete') {
        const isIncrement = task.targetCount > 1;
        res = await completeOccurrence(task._id, dateStr, isIncrement);
      } else if (action === 'skip') {
        res = await skipOccurrence(task._id, dateStr);
      } else if (action === 'clear') {
        res = await completeOccurrence(task._id, dateStr, false, true);
      }
      if (res?.task) {
        setTask({ ...res.task, streak: res.streak, weeklyProgress: res.weeklyProgress });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  const totalDays = getDaysInMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Recurrence label
  const recurrenceLabel = task.recurrence?.type
    ? `${task.recurrence.type.charAt(0).toUpperCase()}${task.recurrence.type.slice(1)}`
    : 'One-time';

  // Calculations
  const completions = task.completions || [];
  const completedDays = completions.filter(c => c.status === 'done').length;
  const totalUnits = completions.reduce((sum, c) => sum + (c.count || 0), 0);

  // Monthly Calculations (filtered by currently selected currentMonth and currentYear)
  const monthlyCompletions = completions.filter(c => {
    if (!c.date) return false;
    const parts = c.date.split('-');
    if (parts.length < 2) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    return year === currentYear && month === currentMonth;
  });
  const monthlyUnits = monthlyCompletions.reduce((sum, c) => sum + (c.count || 0), 0);
  const monthlyCompletedDays = monthlyCompletions.filter(c => c.status === 'done').length;

  // Completion Rate (Score)
  const startDateStr = task.recurrence?.startDate || task.createdAt;
  const startDate = new Date(startDateStr);
  const today = new Date();
  startDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = Math.max(0, today - startDate);
  const elapsedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const completionRate = Math.min(100, Math.round((completedDays / elapsedDays) * 100));

  // Sort completions descending for timeline
  const sortedCompletions = [...completions].sort((a, b) => b.date.localeCompare(a.date));

  const formatTimelineDate = (dateStr) => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const handleExportNotes = () => {
    const completions = task.completions || [];
    const notesCompletions = [...completions]
      .filter(c => (c.note && c.note.trim() !== '') || c.status === 'done' || (c.count !== undefined && c.count >= 1))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (notesCompletions.length === 0) return;

    let fileContent = `TASK: ${task.title.toUpperCase()}\n`;
    fileContent += `Exported Notes & Completed Statuses (Day-wise)\n`;
    fileContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    fileContent += `=========================================\n\n`;

    notesCompletions.forEach((compItem) => {
      fileContent += `Date: ${formatTimelineDate(compItem.date)} (${compItem.date})\n`;
      fileContent += `Status: ${compItem.status.toUpperCase()}\n`;
      if (task.targetCount > 1) {
        fileContent += `Progress: ${compItem.count || 0}/${task.targetCount} units\n`;
      }
      fileContent += `Note:\n${compItem.note || '(None)'}\n`;
      fileContent += `-----------------------------------------\n\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${task.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_daily_notes.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full p-4 lg:p-8">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border-2 border-black dark:border-white font-mono text-xs uppercase font-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Task Header info card */}
      <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-start gap-4">
        <div className="w-11 h-11 bg-yellow-400 border-2 border-black flex items-center justify-center text-black font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {task.title.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">{task.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block text-xs font-black uppercase tracking-widest bg-neutral-200 dark:bg-neutral-800 text-black/60 dark:text-white/60 px-2 py-0.5 border border-black dark:border-white">
              {recurrenceLabel}
            </span>
            {task.category && (
              <span className="chip text-black dark:text-white py-0.5 text-xs">
                {task.category.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Current Streak */}
            <div className="bg-orange-100 dark:bg-orange-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-1" />
              <span className="text-xl lg:text-2xl font-black">{task.streak || 0}</span>
              <span className="text-[10px] uppercase font-black text-black/55 dark:text-white/55 tracking-wider">Streak</span>
            </div>

            {/* Lifetime Completions */}
            <div className="bg-emerald-100 dark:bg-emerald-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-xl lg:text-2xl font-black">
                {task.targetCount > 1 ? totalUnits : completedDays}
              </span>
              <span className="text-[10px] uppercase font-black text-black/55 dark:text-white/55 tracking-wider truncate">
                {task.targetCount > 1 ? 'Total Units' : 'Total Times'}
              </span>
            </div>

            {/* Monthly Completions */}
            <div className="bg-purple-100 dark:bg-purple-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-xl lg:text-2xl font-black">
                {task.targetCount > 1 ? monthlyUnits : monthlyCompletedDays}
              </span>
              <span className="text-[10px] uppercase font-black text-black/55 dark:text-white/55 tracking-wider truncate">
                {task.targetCount > 1 ? 'Monthly Units' : 'Monthly Times'}
              </span>
            </div>

            {/* Completion Rate / Score */}
            <div className="bg-blue-100 dark:bg-blue-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-1" />
              <span className="text-xl lg:text-2xl font-black">{completionRate}%</span>
              <span className="text-[10px] uppercase font-black text-black/55 dark:text-white/55 tracking-wider">Score</span>
            </div>
          </div>

          {/* Description Card */}
          {task.description && (
            <div className="border-2 border-black dark:border-white p-3 bg-neutral-50 dark:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <h4 className="text-xs uppercase font-black tracking-wider text-black/50 dark:text-white/50 mb-1">Description</h4>
              <p className="text-sm font-bold">{task.description}</p>
            </div>
          )}

          {/* Calendar & Timeline Layout */}
          {task.type === 'repeating' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Habit Calendar Grid */}
              <div className="lg:col-span-7 xl:col-span-8 border-2 border-black dark:border-white p-3 bg-white dark:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              {/* Calendar Header */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center mb-4">
                <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-black dark:text-white" /> Habit Calendar
                </h3>
                <div className="flex items-center gap-1.5 justify-between w-full sm:w-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                    className="w-9 h-9 flex items-center justify-center bg-white dark:bg-neutral-900 border-2 border-black dark:border-white hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-black dark:text-white"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-mono font-black text-sm sm:text-base uppercase tracking-wider px-4 py-1.5 bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-w-[140px] text-center flex-1 sm:flex-initial">
                    {MONTHS[currentMonth]} {currentYear}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                    className="w-9 h-9 flex items-center justify-center bg-white dark:bg-neutral-900 border-2 border-black dark:border-white hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-black dark:text-white"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1.5 text-center font-black text-xs sm:text-sm uppercase tracking-wider text-black/60 dark:text-white/60 mb-2 border-b border-black/10 dark:border-white/10 pb-1">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Grid cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells for leading offset */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div 
                    key={`empty-${idx}`} 
                    className="aspect-square border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20"
                  />
                ))}

                {/* Day cells */}
                {Array.from({ length: totalDays }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  
                  const comp = completions.find(c => c.date === dateStr);
                  const isDone = comp?.status === 'done';
                  const isSkipped = comp?.status === 'skipped';
                  const isTodo = comp?.status === 'todo';
                  const count = comp?.count || 0;
                  
                  const cellDate = new Date(currentYear, currentMonth, day);
                  const todayDate = new Date();
                  todayDate.setHours(0,0,0,0);
                  const isTodayCell = cellDate.getTime() === todayDate.getTime();
                  const isFutureCell = cellDate > todayDate;

                  const fiveDaysAgo = new Date();
                  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
                  fiveDaysAgo.setHours(0,0,0,0);
                  const isTooOld = cellDate < fiveDaysAgo;
                  const isEditable = !isFutureCell && !isTooOld;

                  let cellClass = "aspect-square border-2 flex flex-col justify-between p-1 sm:p-1.5 font-mono transition-all relative ";

                  if (selectedDayMenu?.dateStr === dateStr) {
                    cellClass += "z-20 ";
                  }

                  if (isEditable) {
                    cellClass += "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer ";
                  } else {
                    cellClass += "cursor-default ";
                  }

                  if (isDone) {
                    cellClass += "bg-emerald-400 dark:bg-emerald-500 text-black border-black dark:border-white font-black";
                  } else if (isSkipped) {
                    cellClass += "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 line-through border-neutral-350 dark:border-neutral-700";
                  } else if (isFutureCell) {
                    cellClass += "bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-300 dark:text-neutral-700 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60 pointer-events-none";
                  } else if (isTodayCell) {
                    if (isTodo && count > 0) {
                      cellClass += "bg-emerald-100 dark:bg-emerald-950/80 text-black dark:text-emerald-300 border-black dark:border-white font-bold";
                    } else {
                      cellClass += "bg-white dark:bg-neutral-950 text-black dark:text-white border-black dark:border-white";
                    }
                  } else {
                    // Past cell, not done, and not skipped -> Missed! (Red color)
                    if (isTooOld) {
                      cellClass += "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 opacity-70";
                    } else {
                      cellClass += "bg-red-400 dark:bg-red-500 text-black border-black dark:border-white font-bold";
                    }
                  }

                  if (isTodayCell) {
                    cellClass += " ring-2 ring-yellow-400 dark:ring-yellow-400 border-black dark:border-white";
                  }

                  const isFirstRow = (day + firstDayIndex) <= 7;
                  const menuPositionClass = isFirstRow ? "top-full mt-1.5" : "bottom-full mb-1.5";

                  return (
                    <div 
                      key={`day-${day}`} 
                      className={cellClass}
                      onClick={() => {
                        if (isEditable) {
                          const cellInfo = { day, dateStr };
                          setSelectedDayMenu(
                            selectedDayMenu?.dateStr === dateStr 
                              ? null 
                              : cellInfo
                          );
                          setSelectedDayNote(cellInfo);
                        }
                      }}
                      title={
                        isDone 
                          ? `Completed: ${count}/${task.targetCount} units`
                          : isSkipped
                            ? `Skipped`
                            : isFutureCell
                              ? `Future Date`
                              : isTodayCell
                                ? isTodo 
                                  ? `In Progress: ${count}/${task.targetCount} units`
                                  : `No progress logged yet`
                                : `Missed${isTooOld ? ' (Locked)' : ''}`
                      }
                    >
                      <span className={`text-xs sm:text-base ${isTodayCell ? 'font-black text-yellow-600 dark:text-yellow-400' : 'font-bold'}`}>
                        {day}
                      </span>
                      {comp?.note && (
                        <FileText className="absolute top-1 right-1 w-2.5 h-2.5 text-black/40 dark:text-white/40" />
                      )}
                      <div className="text-[9px] sm:text-[10px] font-black text-right self-end leading-none">
                        {isDone && (
                          task.targetCount > 1 ? (
                            <span>{count}</span>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] font-bold">✓</span>
                          )
                        )}
                        {isTodo && count > 0 && (
                          <span>{count}/{task.targetCount}</span>
                        )}
                      </div>

                      {/* Popover Menu to Edit Past Date Occurrence */}
                      {selectedDayMenu?.dateStr === dateStr && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute left-1/2 z-30 w-40 bg-black text-white dark:bg-white dark:text-black py-1 border-2 border-black dark:border-white font-mono text-xs uppercase font-black -translate-x-1/2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] ${menuPositionClass}`}
                        >
                          <button 
                            onClick={(e) => handleCellAction('complete', dateStr, e)}
                            className="w-full px-3 py-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left transition-colors duration-100 flex items-center gap-1.5 cursor-pointer"
                          >
                            {task.targetCount > 1 ? '+ Increment' : '✓ Complete'}
                          </button>
                          <button 
                            onClick={(e) => handleCellAction('skip', dateStr, e)}
                            className="w-full px-3 py-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left transition-colors duration-100 flex items-center gap-1.5 cursor-pointer"
                          >
                            → Skip Day
                          </button>
                          {comp && (
                            <button 
                              onClick={(e) => handleCellAction('clear', dateStr, e)}
                              className="w-full px-3 py-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left text-red-400 dark:text-red-650 transition-colors duration-100 flex items-center gap-1.5 cursor-pointer font-bold"
                            >
                              ✕ Clear
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedDayMenu(null); }}
                            className="w-full px-3 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left opacity-60 transition-colors duration-100 cursor-pointer border-t border-current/20 mt-1 pt-1.5"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-black/10 dark:border-white/10 text-[9px] uppercase font-black tracking-wider text-black/60 dark:text-white/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-emerald-400 border-2 border-black" />
                  <span>Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-red-400 border-2 border-black" />
                  <span>Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-neutral-200 dark:bg-neutral-800 border-2 border-black flex items-center justify-center line-through text-[7px] text-neutral-500 font-bold">
                    /
                  </div>
                  <span>Skipped</span>
                </div>
                {task.targetCount > 1 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-black" />
                    <span>In Progress</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-white dark:bg-neutral-950 border-2 border-black" />
                  <span>No Progress (Today)</span>
                </div>
              </div>

            </div>

            {/* Right Column: Note Editor + Timeline History */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              {/* Note Editor */}
              {selectedDayNote && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-yellow-500" />
                      Notes for {formatTimelineDate(selectedDayNote.dateStr)}
                    </span>
                    {noteInput && (
                      <button
                        onClick={() => {
                          setNoteInput('');
                          handleSaveNote('');
                        }}
                        className="text-[9px] text-red-500 hover:underline uppercase font-black tracking-wider cursor-pointer"
                      >
                        Clear Note
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 items-end">
                    <textarea
                      placeholder="Type custom note for this day... (Press Ctrl+Enter to save)"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleSaveNote(noteInput);
                        }
                      }}
                      rows={2}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-neutral-950 border border-black dark:border-white font-mono text-xs text-black dark:text-white resize-y min-h-[50px] leading-relaxed"
                    />
                    <button
                      onClick={() => handleSaveNote(noteInput)}
                      className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 border border-black font-mono text-xs font-black uppercase text-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline History */}
              <div className="border-2 border-black dark:border-white p-3.5 bg-white dark:bg-neutral-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                 Timeline History
               </h3>
               {completions.some(c => (c.note && c.note.trim() !== '') || c.status === 'done' || (c.count !== undefined && c.count >= 1)) && (
                 <button
                   onClick={handleExportNotes}
                   className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 border-2 border-black font-mono text-[10px] font-black uppercase text-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all flex items-center gap-1"
                 >
                   <FileText className="w-3.5 h-3.5 text-black" /> Export Notes (.txt)
                 </button>
               )}
             </div>
            
            <div className="relative pl-6 border-l-2 border-black dark:border-white space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Task Started Marker */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-none bg-black dark:bg-white border-2 border-white dark:border-black" />
                <p className="text-[10px] font-black uppercase text-black/55 dark:text-white/55 font-mono">
                  {formatTimelineDate(startDateStr)}
                </p>
                <h5 className="font-bold text-xs uppercase text-neutral-800 dark:text-neutral-200">Task Started</h5>
              </div>

              {/* Completion Timeline Nodes */}
              {sortedCompletions.length === 0 ? (
                <div className="text-xs font-bold text-black/40 dark:text-white/40 italic py-2">
                  No events logged yet
                </div>
              ) : (
                sortedCompletions.map((compItem, index) => {
                  let badgeColor = "bg-emerald-400";
                  let eventLabel = "Completed";
                  if (compItem.status === 'skipped') {
                    badgeColor = "bg-neutral-400";
                    eventLabel = "Skipped";
                  } else if (compItem.status === 'todo' && compItem.count > 0) {
                    badgeColor = "bg-emerald-200";
                    eventLabel = "Progress Logged";
                  }

                  return (
                    <div key={`${compItem.date}-${index}`} className="relative">
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-none ${badgeColor} border-2 border-black dark:border-white`} />
                      <p className="text-[10px] font-black uppercase text-black/55 dark:text-white/55 font-mono">
                        {formatTimelineDate(compItem.date)}
                      </p>
                      <h5 className="font-bold text-xs uppercase">
                        {eventLabel}
                        {compItem.status !== 'skipped' && task.targetCount > 1 && ` (${compItem.count}/${task.targetCount} units)`}
                      </h5>
                      {compItem.note && (
                        <div className="mt-1 text-xs text-black/60 dark:text-white/60 border-t border-dashed border-black/10 dark:border-white/10 pt-1 flex items-start gap-1 max-w-md">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500 mt-0.5" />
                          <span className="italic whitespace-pre-line">"{compItem.note}"</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    ) : (
        /* Non-repeating task layout (full width timeline) */
        <div className="border-2 border-black dark:border-white p-3.5 bg-white dark:bg-neutral-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              Timeline History
            </h3>
            {completions.some(c => c.note && c.note.trim() !== '') && (
              <button
                onClick={handleExportNotes}
                className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 border-2 border-black font-mono text-[10px] font-black uppercase text-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-black" /> Export Notes (.txt)
              </button>
            )}
          </div>
          
          <div className="relative pl-6 border-l-2 border-black dark:border-white space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Task Started Marker */}
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-none bg-black dark:bg-white border-2 border-white dark:border-black" />
              <p className="text-[10px] font-black uppercase text-black/55 dark:text-white/55 font-mono">
                {formatTimelineDate(startDateStr)}
              </p>
              <h5 className="font-bold text-xs uppercase text-neutral-800 dark:text-neutral-200">Task Started</h5>
            </div>

            {/* Completion Timeline Nodes */}
            {sortedCompletions.length === 0 ? (
              <div className="text-xs font-bold text-black/40 dark:text-white/40 italic py-2">
                No events logged yet
              </div>
            ) : (
              sortedCompletions.map((compItem, index) => {
                let badgeColor = "bg-emerald-400";
                let eventLabel = "Completed";
                if (compItem.status === 'skipped') {
                  badgeColor = "bg-neutral-400";
                  eventLabel = "Skipped";
                } else if (compItem.status === 'todo' && compItem.count > 0) {
                  badgeColor = "bg-emerald-200";
                  eventLabel = "Progress Logged";
                }

                return (
                  <div key={`${compItem.date}-${index}`} className="relative">
                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-none ${badgeColor} border-2 border-black dark:border-white`} />
                    <p className="text-[10px] font-black uppercase text-black/55 dark:text-white/55 font-mono">
                      {formatTimelineDate(compItem.date)}
                    </p>
                    <h5 className="font-bold text-xs uppercase">
                      {eventLabel}
                      {compItem.status !== 'skipped' && task.targetCount > 1 && ` (${compItem.count}/${task.targetCount} units)`}
                    </h5>
                    {compItem.note && (
                      <div className="mt-1 text-xs text-black/60 dark:text-white/60 border-t border-dashed border-black/10 dark:border-white/10 pt-1 flex items-start gap-1 max-w-md">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500 mt-0.5" />
                        <span className="italic whitespace-pre-line">"{compItem.note}"</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
