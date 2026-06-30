import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Trash2, Edit3, SkipForward, Repeat, Flame, MoreHorizontal, GripVertical, Info, FileText } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskContext } from '../context/TaskContext';

const TaskCard = ({ task, isOccurrence, onComplete, onDelete, onEdit, onSkip, onIncrement, onInfo }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);

  const { updateTask } = useTaskContext();
  const [showInlineNoteEditor, setShowInlineNoteEditor] = useState(false);
  const [oneTimeNoteInput, setOneTimeNoteInput] = useState('');

  const handleSaveOneTimeNote = async () => {
    if (!task._id) return;
    try {
      await updateTask(task._id, { note: oneTimeNoteInput });
      setShowInlineNoteEditor(false);
    } catch {}
  };

  const handleClearOneTimeNote = async () => {
    try {
      setOneTimeNoteInput('');
      await updateTask(task._id, { note: '' });
      setShowInlineNoteEditor(false);
    } catch {}
  };

  const toggleMenu = useCallback(() => {
    if (!showMenu && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setFlipUp(spaceBelow < 200);
    }
    setShowMenu(prev => !prev);
  }, [showMenu]);

  // Close on click-outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && menuBtnRef.current && !menuBtnRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);

  const isDone = isOccurrence ? task.status === 'done' : task.status === 'done';
  const isSkipped = task.status === 'skipped';
  const priorityClass = `priority-${task.priority}`;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: isOccurrence ? `${task._id}-${task.date}` : task._id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (titleVal.trim() && titleVal !== task.title) {
      onEdit?.({ ...task, title: titleVal });
    }
  };

  const menuPositionClass = flipUp ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div ref={setNodeRef} style={style}
      className={`card-elevated ${priorityClass} p-5 group ${isDone ? 'task-done' : ''} ${isSkipped ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        <button {...listeners} {...attributes} className="mt-1 cursor-grab text-black/30 dark:text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <GripVertical className="w-5 h-5" />
        </button>

        <button onClick={() => onComplete?.(task)} className={`mt-1.5 flex-shrink-0 w-6 h-6 flex items-center justify-center cursor-pointer transition-all duration-150 ${isDone ? 'bg-black text-white dark:bg-white dark:text-black scale-105' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`} id={`complete-${task._id}`}>
          {isDone && <Check className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            {editingTitle ? (
              <input value={titleVal} onChange={e => setTitleVal(e.target.value)} onBlur={handleTitleSave} onKeyDown={e => e.key === 'Enter' && handleTitleSave()} className="input-field py-1 px-2 text-base font-bold" autoFocus />
            ) : (
              <h3 className="task-title font-black text-lg lg:text-xl cursor-pointer truncate" onClick={() => setEditingTitle(true)}>{task.title}</h3>
            )}
          </div>
          {(task.type === 'repeating' || task.streak > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {task.type === 'repeating' && <Repeat className="w-4 h-4 text-black dark:text-white flex-shrink-0" />}
              {task.streak > 0 && (
                <span className="streak-badge flex-shrink-0"><Flame className="w-3.5 h-3.5" />{task.streak}</span>
              )}
              {task.type === 'repeating' && task.targetCount > 1 && (
                <span className="text-sm font-mono font-black text-black/60 dark:text-white/60">
                  {task.count || 0}/{task.targetCount} times
                </span>
              )}
            </div>
          )}

          {task.description && <p className="text-sm text-black/60 dark:text-white/60 mt-1.5 line-clamp-2 font-bold">{task.description}</p>}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {task.category && (
              <span className="chip text-black dark:text-white">{task.category.name}</span>
            )}
            {task.tags?.map(tag => <span key={tag} className="chip">{tag}</span>)}
          </div>

          {showInlineNoteEditor && (
            <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-yellow-500" />
                  Task Note
                </span>
                {oneTimeNoteInput && (
                  <button
                    onClick={handleClearOneTimeNote}
                    className="text-[9px] text-red-500 hover:underline uppercase font-black tracking-wider cursor-pointer"
                  >
                    Clear Note
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-end">
                <textarea
                  placeholder="Type note for this task..."
                  value={oneTimeNoteInput}
                  onChange={(e) => setOneTimeNoteInput(e.target.value)}
                  rows={2}
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-neutral-950 border border-black dark:border-white font-mono text-xs text-black dark:text-white resize-y min-h-[50px] leading-relaxed"
                />
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={handleSaveOneTimeNote}
                    className="px-2.5 py-1 bg-yellow-450 hover:bg-yellow-500 border border-black font-mono text-[10px] font-black uppercase text-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowInlineNoteEditor(false)}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-black font-mono text-[10px] font-black uppercase text-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showInlineNoteEditor && task.note && (
            <div className="mt-3 p-2.5 bg-yellow-50 dark:bg-neutral-900 border-2 border-dashed border-yellow-400 dark:border-yellow-600 text-xs flex items-start gap-1.5 max-w-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <FileText className="w-4 h-4 flex-shrink-0 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <span className="font-mono font-black uppercase text-[9px] text-yellow-700 dark:text-yellow-400 block tracking-wider leading-none mb-0.5">Note:</span>
                <p className="italic text-black/75 dark:text-white/75 whitespace-pre-line leading-relaxed font-bold">"{task.note}"</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {task.type === 'repeating' && task.targetCount > 1 && !isDone && !isSkipped && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onIncrement?.(task);
              }}
              className="w-8 h-8 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-black text-xl hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer shadow-[2px_2px_0px_0px_#000000] dark:shadow-[2px_2px_0px_0px_#ffffff] hover:shadow-none transition-all duration-150"
              title="Increment Progress"
            >
              +
            </button>
          )}

          <div className="relative">
            <button ref={menuBtnRef} onClick={toggleMenu} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all duration-150 cursor-pointer">
              <MoreHorizontal className="w-5 h-5 text-black dark:text-white" />
            </button>
            {showMenu && (
              <div ref={menuRef} className={`absolute right-0 ${menuPositionClass} z-50 w-36 bg-white dark:bg-neutral-950 border-2 border-black dark:border-white py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]`}>
                {task.type === 'repeating' && (
                  <button onClick={() => { onInfo?.(task); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-yellow-400 hover:text-black dark:hover:bg-yellow-400 dark:hover:text-black cursor-pointer transition-colors duration-100 text-left text-black dark:text-white">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" /> Info
                  </button>
                )}
                <button onClick={() => { onEdit?.(task); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-yellow-400 hover:text-black dark:hover:bg-yellow-400 dark:hover:text-black cursor-pointer transition-colors duration-100 text-left text-black dark:text-white">
                  <Edit3 className="w-3.5 h-3.5 flex-shrink-0" /> Edit
                </button>
                {!isOccurrence && task.type !== 'repeating' && (
                  <button 
                    onClick={() => { 
                      setOneTimeNoteInput(task.note || '');
                      setShowInlineNoteEditor(true); 
                      setShowMenu(false); 
                    }} 
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-yellow-400 hover:text-black dark:hover:bg-yellow-400 dark:hover:text-black cursor-pointer transition-colors duration-100 text-left text-black dark:text-white"
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" /> Add/Edit Note
                  </button>
                )}
                {isOccurrence && onSkip && (
                  <button onClick={() => { onSkip?.(task); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-yellow-400 hover:text-black dark:hover:bg-yellow-400 dark:hover:text-black cursor-pointer transition-colors duration-100 text-left text-black dark:text-white">
                    <SkipForward className="w-3.5 h-3.5 flex-shrink-0" /> Skip
                  </button>
                )}
                <div className="border-t border-black/10 dark:border-white/10 my-1" />
                <button onClick={() => { onDelete?.(task); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-red-500 hover:text-white cursor-pointer transition-colors duration-100 text-left text-red-600 dark:text-red-400">
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
