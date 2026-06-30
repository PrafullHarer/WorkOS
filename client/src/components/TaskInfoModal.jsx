import { useState, useEffect } from 'react';
import { X, Calendar, Flame, CheckCircle2, Award, ClipboardList, Info, Activity, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { formatDate, getDaysInMonth, getFirstDayOfMonth } from '../utils/dateHelpers';
import { useTaskContext } from '../context/TaskContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TaskInfoModal = ({ isOpen, onClose, task }) => {
  const { repeatingTasks, completeOccurrence, skipOccurrence, updateOccurrenceNote } = useTaskContext();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDayMenu, setSelectedDayMenu] = useState(null);
  const [selectedDayNote, setSelectedDayNote] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      const todayDate = new Date();
      setCurrentMonth(todayDate.getMonth());
      setCurrentYear(todayDate.getFullYear());
      setSelectedDayMenu(null);
      setSelectedDayNote(null);
      setShowTimeline(false);
    }
  }, [isOpen, task?._id]);

  if (!isOpen || !task) return null;

  const activeTask = (task.type === 'repeating' && repeatingTasks.find(t => t._id.toString() === task._id.toString())) || task;

  // Sync note input when selection changes
  useEffect(() => {
    if (selectedDayNote) {
      const comp = (activeTask.completions || []).find(c => c.date === selectedDayNote.dateStr);
      setNoteInput(comp?.note || '');
    } else {
      setNoteInput('');
    }
  }, [selectedDayNote, activeTask.completions]);

  const handleSaveNote = async (noteVal) => {
    if (!selectedDayNote) return;
    try {
      await updateOccurrenceNote(activeTask._id, selectedDayNote.dateStr, noteVal);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCellAction = async (action, dateStr, e) => {
    if (e) e.stopPropagation();
    setSelectedDayMenu(null);
    try {
      if (action === 'complete') {
        const isIncrement = activeTask.targetCount > 1;
        await completeOccurrence(activeTask._id, dateStr, isIncrement);
      } else if (action === 'skip') {
        await skipOccurrence(activeTask._id, dateStr);
      } else if (action === 'clear') {
        await completeOccurrence(activeTask._id, dateStr, false, true);
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
  const recurrenceLabel = activeTask.recurrence?.type
    ? `${activeTask.recurrence.type.charAt(0).toUpperCase()}${activeTask.recurrence.type.slice(1)}`
    : 'One-time';

  // Calculations
  const completions = activeTask.completions || [];
  const completedDays = completions.filter(c => c.status === 'done').length;
  
  // Total units done
  const totalUnits = completions.reduce((sum, c) => sum + (c.count || 0), 0);

  // Monthly stats
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
  const startDateStr = activeTask.recurrence?.startDate || activeTask.createdAt;
  const startDate = new Date(startDateStr);
  const today = new Date();
  // Clear times for date diff
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
    const completions = activeTask.completions || [];
    const notesCompletions = [...completions]
      .filter(c => (c.note && c.note.trim() !== '') || c.status === 'done' || (c.count !== undefined && c.count >= 1))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (notesCompletions.length === 0) return;

    let fileContent = `TASK: ${activeTask.title.toUpperCase()}\n`;
    fileContent += `Exported Notes & Completed Statuses (Day-wise)\n`;
    fileContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    fileContent += `=========================================\n\n`;

    notesCompletions.forEach((compItem) => {
      fileContent += `Date: ${formatTimelineDate(compItem.date)} (${compItem.date})\n`;
      fileContent += `Status: ${compItem.status.toUpperCase()}\n`;
      if (activeTask.targetCount > 1) {
        fileContent += `Progress: ${compItem.count || 0}/${activeTask.targetCount} units\n`;
      }
      fileContent += `Note:\n${compItem.note || '(None)'}\n`;
      fileContent += `-----------------------------------------\n\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTask.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_daily_notes.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content max-w-xl w-full transition-all duration-200 max-h-[85vh] overflow-y-auto p-5 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-white mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-400 border-2 border-black flex items-center justify-center text-black font-black text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {activeTask.title.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">{activeTask.title}</h2>
              <span className="inline-block mt-1 text-xs font-black uppercase tracking-widest bg-neutral-200 dark:bg-neutral-800 text-black/60 dark:text-white/60 px-2 py-0.5 border border-black dark:border-white">
                {recurrenceLabel}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white transition-colors duration-150 cursor-pointer"
            id="close-info-modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Current Streak */}
          <div className="bg-orange-100 dark:bg-orange-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-1" />
            <span className="text-xl lg:text-2xl font-black">{activeTask.streak || 0}</span>
            <span className="text-[10px] uppercase font-black text-black/50 dark:text-white/50 tracking-wider">Streak</span>
          </div>

          {/* Completions */}
          <div className="bg-emerald-100 dark:bg-emerald-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1" />
            <span className="text-xl lg:text-2xl font-black">
              {activeTask.targetCount > 1 ? totalUnits : completedDays}
            </span>
            <span className="text-[10px] uppercase font-black text-black/50 dark:text-white/50 tracking-wider">
              {activeTask.targetCount > 1 ? 'Units Done' : 'Times Done'}
            </span>
          </div>

          {/* Monthly progress */}
          <div className="bg-purple-100 dark:bg-purple-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-1" />
            <span className="text-xl lg:text-2xl font-black">
              {activeTask.targetCount > 1 ? monthlyUnits : monthlyCompletedDays}
            </span>
            <span className="text-[10px] uppercase font-black text-black/55 dark:text-white/55 tracking-wider truncate">
              {activeTask.targetCount > 1 ? 'Monthly Units' : 'Monthly Times'}
            </span>
          </div>

          {/* Completion Rate / Score */}
          <div className="bg-blue-100 dark:bg-blue-950 border-2 border-black dark:border-white p-3 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-1" />
            <span className="text-xl lg:text-2xl font-black">{completionRate}%</span>
            <span className="text-[10px] uppercase font-black text-black/50 dark:text-white/50 tracking-wider">Score</span>
          </div>
        </div>

        {/* Info detail card */}
        {activeTask.description && (
          <div className="border-2 border-black dark:border-white p-3 mb-4 bg-neutral-50 dark:bg-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h4 className="text-xs uppercase font-black tracking-wider text-black/50 dark:text-white/50 mb-1">Description</h4>
            <p className="text-sm font-bold">{activeTask.description}</p>
          </div>
        )}

        {/* Habit Calendar Grid */}
        {activeTask.type === 'repeating' && (
          <div className="border-2 border-black dark:border-white p-3 mb-4 bg-white dark:bg-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            {/* Calendar Header */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-between sm:items-center mb-3">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-black dark:text-white" /> Habit Calendar
              </h3>
              <div className="flex items-center gap-1.5 justify-between w-full sm:w-auto">
                <button 
                  onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-neutral-900 border-2 border-black dark:border-white hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-black dark:text-white"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-black text-xs uppercase tracking-wider px-3 py-1 bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-w-[120px] text-center flex-1 sm:flex-initial">
                  {MONTHS[currentMonth]} {currentYear}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-neutral-900 border-2 border-black dark:border-white hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-black dark:text-white"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1.5 text-center font-black text-[10px] uppercase tracking-wider text-black/60 dark:text-white/60 mb-2 border-b border-black/10 dark:border-white/10 pb-1">
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
                } else if (isTodo && count > 0) {
                  cellClass += "bg-emerald-100 dark:bg-emerald-950/80 text-black dark:text-emerald-300 border-black dark:border-white font-bold";
                } else {
                  if (isFutureCell) {
                    cellClass += "bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-300 dark:text-neutral-700 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60 pointer-events-none";
                  } else if (isTooOld) {
                    cellClass += "bg-neutral-100 dark:bg-neutral-900/50 text-neutral-450 dark:text-neutral-600 border-neutral-200 dark:border-neutral-800 opacity-70";
                  } else {
                    cellClass += "bg-white dark:bg-neutral-950 text-black dark:text-white border-black dark:border-white";
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
                        ? `Completed: ${count}/${activeTask.targetCount} units`
                        : isSkipped 
                          ? `Skipped` 
                          : isTodo 
                            ? `In Progress: ${count}/${activeTask.targetCount} units`
                            : isFutureCell
                              ? `Future Date`
                              : isTooOld
                                ? `Locked (older than 5 days)`
                                : `No progress logged`
                    }
                  >
                    <span className={`text-[9px] sm:text-[10px] ${isTodayCell ? 'font-black text-yellow-600 dark:text-yellow-400' : 'font-bold'}`}>
                      {day}
                    </span>
                    {comp?.note && (
                      <FileText className="absolute top-0.5 right-0.5 w-2 h-2 text-black/40 dark:text-white/40" />
                    )}
                    <div className="text-[7px] sm:text-[8px] font-black text-right self-end leading-none">
                      {isDone && (
                        activeTask.targetCount > 1 ? (
                          <span>{count}</span>
                        ) : (
                          <span className="text-[8px] sm:text-[9px] font-bold">✓</span>
                        )
                      )}
                      {isTodo && count > 0 && (
                        <span>{count}/{activeTask.targetCount}</span>
                      )}
                      {isSkipped && (
                        <span className="text-[7px] font-bold tracking-tight">SKIP</span>
                      )}
                      {!comp && !isFutureCell && activeTask.targetCount > 1 && (
                        <span className="opacity-20">0/{activeTask.targetCount}</span>
                      )}
                    </div>

                    {/* Popover Menu to Edit Past Date Occurrence */}
                    {selectedDayMenu?.dateStr === dateStr && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-1/2 z-30 w-32 bg-black text-white dark:bg-white dark:text-black py-1 border-2 border-black dark:border-white font-mono text-[9px] uppercase font-black -translate-x-1/2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] ${menuPositionClass}`}
                      >
                        <button 
                          onClick={(e) => handleCellAction('complete', dateStr, e)}
                          className="w-full px-2 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left transition-colors duration-100 flex items-center gap-1 cursor-pointer"
                        >
                          {activeTask.targetCount > 1 ? '+ Increment' : '✓ Complete'}
                        </button>
                        <button 
                          onClick={(e) => handleCellAction('skip', dateStr, e)}
                          className="w-full px-2 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left transition-colors duration-100 flex items-center gap-1 cursor-pointer"
                        >
                          → Skip Day
                        </button>
                        {comp && (
                          <button 
                            onClick={(e) => handleCellAction('clear', dateStr, e)}
                            className="w-full px-2 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left text-red-400 dark:text-red-650 transition-colors duration-100 flex items-center gap-1 cursor-pointer font-bold"
                          >
                            ✕ Clear
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedDayMenu(null); }}
                          className="w-full px-2 py-1 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-left opacity-60 transition-colors duration-100 cursor-pointer border-t border-current/20 mt-1 pt-1"
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
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 pt-2 border-t border-black/10 dark:border-white/10 text-[9px] uppercase font-black tracking-wider text-black/60 dark:text-white/60">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-emerald-400 border-2 border-black" />
                <span>Done</span>
              </div>
              {activeTask.targetCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-black" />
                  <span>In Progress</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-neutral-200 dark:bg-neutral-800 border-2 border-black flex items-center justify-center line-through text-[7px] text-neutral-500 font-bold">
                  /
                </div>
                <span>Skipped</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-white dark:bg-neutral-950 border-2 border-black" />
                <span>Uncompleted</span>
              </div>
            </div>

            {/* Note Editor */}
            {selectedDayNote && (
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
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
          </div>
        )}

        {/* Toggle Timeline History Button */}
        <div className={`${showTimeline ? 'mb-6' : 'mb-0'} flex justify-center`}>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-900 border-2 border-black dark:border-white font-mono text-xs uppercase font-black tracking-wider transition-all duration-150 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            {showTimeline ? 'Hide Timeline History' : 'Show Timeline History'}
          </button>
        </div>

        {/* Timeline */}
        {showTimeline && (
          <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                 <ClipboardList className="w-5 h-5 text-black dark:text-white" /> Timeline History
               </h3>
               {activeTask.completions?.some(c => (c.note && c.note.trim() !== '') || c.status === 'done' || (c.count !== undefined && c.count >= 1)) && (
                 <button
                   onClick={handleExportNotes}
                   className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 border-2 border-black font-mono text-[10px] font-black uppercase text-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all flex items-center gap-1"
                 >
                   <FileText className="w-3.5 h-3.5 text-black" /> Export Notes (.txt)
                 </button>
               )}
             </div>

            <div className="border-l-4 border-black dark:border-white ml-3.5 pl-6 space-y-5 relative py-2">
              {/* Active completions history */}
              {sortedCompletions.length === 0 ? (
                <div className="text-sm text-black/50 dark:text-white/50 font-bold italic pl-2">
                  No activity logged yet. Complete occurrences to start the timeline!
                </div>
              ) : (
                sortedCompletions.map((comp, idx) => {
                  const isSkip = comp.status === 'skipped';
                  const isFullyDone = comp.status === 'done';
                  let desc = 'Completed task';
                  if (isSkip) {
                    desc = 'Skipped';
                  } else if (activeTask.targetCount > 1) {
                    desc = `Completed ${comp.count || 0}/${activeTask.targetCount} steps`;
                  }

                  return (
                    <div key={idx} className="relative">
                      {/* Circle marker */}
                      <div className={`absolute -left-[35px] top-0.5 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
                        ${isSkip 
                          ? 'bg-neutral-400 text-black' 
                          : isFullyDone 
                            ? 'bg-yellow-400 text-black' 
                            : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                      </div>

                      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 p-3 hover:border-black dark:hover:border-white transition-all duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black uppercase">{desc}</span>
                          <span className="text-xs font-mono font-black text-black/40 dark:text-white/40">
                            {formatTimelineDate(comp.date)}
                          </span>
                        </div>
                        {comp.note && (
                          <div className="mt-2 text-xs text-black/60 dark:text-white/60 border-t border-dashed border-black/10 dark:border-white/10 pt-1.5 flex items-start gap-1">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500 mt-0.5" />
                            <span className="italic whitespace-pre-line">"{comp.note}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Created at marker */}
              <div className="relative pt-2">
                <div className="absolute -left-[35px] top-3.5 w-5 h-5 rounded-full border-2 border-black bg-black dark:bg-white flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  <Info className="w-3 h-3 text-white dark:text-black" />
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-900 p-3 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black uppercase text-black/60 dark:text-white/60">Task Started</span>
                    <span className="text-xs font-mono font-black text-black/40 dark:text-white/40">
                      {new Date(startDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskInfoModal;
