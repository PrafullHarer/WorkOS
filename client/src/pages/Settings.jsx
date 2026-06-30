import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useTaskContext } from '../context/TaskContext';
import { taskAPI } from '../api';
import { exportToJSON, exportToCSV, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, User, Lock, Palette, Download, Trash2, Plus, Moon, Sun, Eye, EyeOff, X } from 'lucide-react';

const Settings = () => {
  const { user, updateProfile, toggleDarkMode, deleteAccount } = useAuthContext();
  const { categories, createCategory, deleteCategory } = useTaskContext();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [defPriority, setDefPriority] = useState(user?.preferences?.defaultPriority || 'medium');
  const [showCompleted, setShowCompleted] = useState(user?.preferences?.showCompleted !== false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [includeOneTime, setIncludeOneTime] = useState(false);

  const isDark = document.documentElement.classList.contains('dark');

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const data = { name, email, preferences: { defaultPriority: defPriority, showCompleted } };
      if (password) data.password = password;
      await updateProfile(data);
      setPassword('');
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'));
    } finally { setSaving(false); }
  };

  const handleExport = async (format) => {
    try {
      const { data } = await taskAPI.getAllTasks();
      if (format === 'json') exportToJSON(data.tasks);
      else exportToCSV(data.tasks);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch { toast.error('Export failed'); }
  };

  const handleExportGlobalNotes = async () => {
    try {
      const { data } = await taskAPI.getAllTasks();
      const allTasks = data.tasks || [];
      
      const notesByDate = {};
      allTasks.forEach((task) => {
        // Repeating tasks logic
        if (task.type === 'repeating' && task.completions) {
          task.completions.forEach((c) => {
            const hasNote = c.note && c.note.trim() !== '';
            const atLeastOneUnit = c.status === 'done' || (c.count !== undefined && c.count >= 1);
            if (hasNote || atLeastOneUnit) {
              const compDate = c.date;
              if (exportStartDate && compDate < exportStartDate) return;
              if (exportEndDate && compDate > exportEndDate) return;

              if (!notesByDate[compDate]) {
                notesByDate[compDate] = [];
              }
              notesByDate[compDate].push({
                taskTitle: task.title,
                taskType: 'repeating',
                status: c.status,
                count: c.count || 0,
                targetCount: task.targetCount || 1,
                note: c.note || '',
              });
            }
          });
        }

        // One-time tasks logic (only if includeOneTime is checked)
        if (task.type === 'one-time' && includeOneTime && task.note && task.note.trim() !== '') {
          let taskDate = '';
          if (task.dueDate) {
            taskDate = new Date(task.dueDate).toISOString().split('T')[0];
          } else if (task.createdAt) {
            taskDate = new Date(task.createdAt).toISOString().split('T')[0];
          } else {
            taskDate = new Date().toISOString().split('T')[0];
          }

          if (exportStartDate && taskDate < exportStartDate) return;
          if (exportEndDate && taskDate > exportEndDate) return;

          if (!notesByDate[taskDate]) {
            notesByDate[taskDate] = [];
          }
          notesByDate[taskDate].push({
            taskTitle: task.title,
            taskType: 'one-time',
            status: task.status || 'todo',
            count: task.status === 'done' ? 1 : 0,
            targetCount: 1,
            note: task.note,
          });
        }
      });

      const sortedDates = Object.keys(notesByDate).sort();

      if (sortedDates.length === 0) {
        toast.error('No notes found for the selected criteria.');
        return;
      }

      let fileContent = `ALL TASKS DAILY NOTES EXPORT\n`;
      fileContent += `Date Range: ${exportStartDate || 'All Time'} to ${exportEndDate || 'All Time'}\n`;
      fileContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
      fileContent += `=========================================\n\n`;

      sortedDates.forEach((dateStr) => {
        let dateLabel = dateStr;
        try {
          const dateObj = new Date(dateStr + 'T12:00:00');
          dateLabel = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {}

        fileContent += `DATE: ${dateLabel} (${dateStr})\n`;
        fileContent += `=========================================\n`;

        notesByDate[dateStr].forEach((item) => {
          const typeLabel = item.taskType === 'one-time' ? '[ONE-TIME]' : '[REPEATING]';
          fileContent += `  - TASK: ${item.taskTitle.toUpperCase()} ${typeLabel}\n`;
          fileContent += `    Status: ${item.status.toUpperCase()}\n`;
          if (item.taskType === 'repeating' && item.targetCount > 1) {
            fileContent += `    Progress: ${item.count}/${item.targetCount} units\n`;
          }
          const noteText = item.note ? item.note.replace(/\n/g, '\n    ') : '(None)';
          fileContent += `    Note:\n    ${noteText}\n`;
          fileContent += `  ---------------------------------------\n`;
        });
        fileContent += `\n`;
      });

      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const startTag = exportStartDate ? exportStartDate : 'start';
      const endTag = exportEndDate ? exportEndDate : 'end';
      link.download = `all_tasks_daily_notes_${startTag}_to_${endTag}.txt`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Notes exported successfully!');
    } catch (err) {
      toast.error('Failed to export notes.');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await createCategory({ name: newCatName.trim(), color: newCatColor });
      setNewCatName('');
    } catch {}
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success('Account deleted');
    } catch { toast.error('Failed to delete account'); }
  };

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-black dark:text-white" /> Settings
        </h1>

        {/* Profile */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5 text-black dark:text-white" /> Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" id="settings-name" /></div>
            <div><label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" id="settings-email" /></div>
          </div>
          <div><label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5"><Lock className="w-4 h-4 inline mr-1" />New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" className="input-field" id="settings-password" /></div>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary cursor-pointer" id="save-profile-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Preferences */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-black dark:text-white" /> Preferences</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">Default Priority</label>
              <select value={defPriority} onChange={e => setDefPriority(e.target.value)} className="input-field w-48 cursor-pointer" id="default-priority">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select></div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Show completed tasks</p><p className="text-xs text-surface-500">Display completed tasks in dashboard</p></div>
              <button onClick={() => setShowCompleted(!showCompleted)} className={`w-12 h-7 border-2 border-black dark:border-white transition-all duration-150 cursor-pointer ${showCompleted ? 'bg-black dark:bg-white' : 'bg-white dark:bg-black'}`}>
                <div className={`w-4 h-4 border border-black dark:border-white transition-transform duration-150 ${showCompleted ? 'bg-white dark:bg-black translate-x-5' : 'bg-black dark:bg-white translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-surface-500">Toggle dark theme</p></div>
              <button onClick={toggleDarkMode} className={`w-12 h-7 border-2 border-black dark:border-white transition-all duration-150 cursor-pointer ${isDark ? 'bg-black dark:bg-white' : 'bg-white dark:bg-black'}`} id="dark-mode-settings-toggle">
                <div className={`w-4 h-4 border border-black dark:border-white transition-transform duration-150 ${isDark ? 'bg-white dark:bg-black translate-x-5' : 'bg-black dark:bg-white translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-black dark:text-white" /> Categories</h2>
          <div className="flex items-center gap-3">
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" className="input-field flex-1" id="new-category-name" />
            <button onClick={handleCreateCategory} disabled={!newCatName.trim()} className="btn-primary flex items-center gap-1 cursor-pointer"><Plus className="w-4 h-4" /> Add</button>
          </div>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat._id} className="flex items-center justify-between p-3 border border-black dark:border-white bg-white dark:bg-black">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 border border-black dark:border-white" />
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <button onClick={() => deleteCategory(cat._id)} className="p-1.5 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-150 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Download className="w-5 h-5 text-black dark:text-white" /> Data Export</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => handleExport('json')} className="btn-secondary flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"><Download className="w-4 h-4" /> Export JSON</button>
            <button onClick={() => handleExport('csv')} className="btn-secondary flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"><Download className="w-4 h-4" /> Export CSV</button>
          </div>
        </div>

        {/* Daily Notes Export */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Download className="w-5 h-5 text-black dark:text-white" /> Global Daily Notes Export</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Export all daily custom notes from all repeating tasks in a single date-wise chronologically sorted text file.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Start Date</label>
              <input 
                type="date" 
                value={exportStartDate} 
                onChange={(e) => setExportStartDate(e.target.value)} 
                className="input-field" 
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">End Date</label>
              <input 
                type="date" 
                value={exportEndDate} 
                onChange={(e) => setExportEndDate(e.target.value)} 
                className="input-field" 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 py-1">
            <input 
              type="checkbox" 
              id="include-one-time-toggle" 
              checked={includeOneTime} 
              onChange={(e) => setIncludeOneTime(e.target.checked)} 
              className="w-4 h-4 border-2 border-black dark:border-white accent-black dark:accent-white cursor-pointer"
            />
            <label htmlFor="include-one-time-toggle" className="text-xs font-black uppercase tracking-wider cursor-pointer select-none">
              Include One-Time Task Notes
            </label>
          </div>
          <button 
            onClick={handleExportGlobalNotes} 
            className="btn-primary flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" /> Export All Notes (.txt)
          </button>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 border-2 border-black dark:border-white space-y-4">
          <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2"><Trash2 className="w-5 h-5" /> Danger Zone</h2>
          <p className="text-sm text-surface-500">Permanently delete your account and all data.</p>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-primary cursor-pointer" id="delete-account-btn">Delete Account</button>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-black dark:text-white mb-3">Delete Account?</h3>
              <p className="text-sm text-surface-500 mb-6">This action cannot be undone. All your tasks and data will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDeleteAccount} className="btn-primary flex-1">Delete Forever</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Settings;
