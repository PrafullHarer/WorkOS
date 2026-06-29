import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useTaskContext } from '../context/TaskContext';
import { taskAPI } from '../api';
import { exportToJSON, exportToCSV } from '../utils/helpers';
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
      toast.error(err.response?.data?.error || 'Update failed');
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
