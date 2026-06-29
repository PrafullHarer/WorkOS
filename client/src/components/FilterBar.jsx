import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

const FilterBar = ({ onFilterChange, onSearchChange }) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (val) => {
    setSearch(val);
    onSearchChange?.(val);
  };

  const handleFilter = (key, val) => {
    const updated = { ...filters, [key]: val };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const clearFilters = () => {
    setFilters({ status: '', priority: '', category: '' });
    setSearch('');
    onFilterChange?.({ status: '', priority: '', category: '' });
    onSearchChange?.('');
  };

  const hasActive = search || Object.values(filters).some(Boolean);

  return (
    <div className="card p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/60 dark:text-white/60" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search tasks..." className="input-field pl-12" id="search-input" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto ${showFilters ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`} id="filter-toggle">
          <Filter className="w-5 h-5" /> Filters
        </button>
        {hasActive && (
          <button onClick={clearFilters} className="p-3 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-150 cursor-pointer w-full sm:w-auto flex items-center justify-center" id="clear-filters-btn">
            <X className="w-5 h-5" /> <span className="sm:hidden font-black ml-2 uppercase text-sm">Clear Filters</span>
          </button>
        )}
      </div>
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          <select value={filters.status} onChange={e => handleFilter('status', e.target.value)} className="input-field text-base font-bold cursor-pointer" id="filter-status">
            <option value="">All Status</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option>
          </select>
          <select value={filters.priority} onChange={e => handleFilter('priority', e.target.value)} className="input-field text-base font-bold cursor-pointer" id="filter-priority">
            <option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <select value={filters.category} onChange={e => handleFilter('category', e.target.value)} className="input-field text-base font-bold cursor-pointer" id="filter-category">
            <option value="">All Categories</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
