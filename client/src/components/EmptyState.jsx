import { ClipboardList } from 'lucide-react';

const EmptyState = ({ title = 'No tasks yet', message = 'Create your first task to get started!', icon: Icon = ClipboardList }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-5">
        <Icon className="w-10 h-10 text-surface-300 dark:text-surface-600" />
      </div>
      <h3 className="text-lg font-semibold text-surface-600 dark:text-surface-400 mb-2">{title}</h3>
      <p className="text-sm text-surface-400 dark:text-surface-500 max-w-xs">{message}</p>
    </div>
  );
};

export default EmptyState;
