import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useTaskContext } from '../context/TaskContext';
import StaggeredMenu from './StaggeredMenu';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Settings,
  LogOut,
  X,
  Flame,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, toggleDarkMode } = useAuthContext();
  const { categories } = useTaskContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = document.documentElement.classList.contains('dark');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/upcoming', icon: Clock, label: 'Upcoming' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const menuItems = [
    { label: 'Dashboard', link: '/dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Calendar', link: '/calendar', onClick: () => navigate('/calendar') },
    { label: 'Upcoming', link: '/upcoming', onClick: () => navigate('/upcoming') },
    { label: 'Settings', link: '/settings', onClick: () => navigate('/settings') },
    { label: 'Logout', link: '#', onClick: handleLogout }
  ];

  const socialItems = [
    { label: 'GitHub', link: 'https://github.com' }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* Logo */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-black dark:bg-white flex items-center justify-center">
            <Flame className="w-5 h-5 text-white dark:text-black" />
          </div>
          <span className="text-lg font-black text-black dark:text-white uppercase tracking-wider">
            TaskMaste
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-black dark:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-base">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base truncate">{user.name}</p>
              <p className="text-xs text-black/50 dark:text-white/50 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
            id={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Categories section */}
        {categories.length > 0 && (
          <div className="pt-4 mt-4">
            <p className="px-4 mb-2 text-xs font-black uppercase tracking-wider text-black/55 dark:text-white/55">
              Categories
            </p>
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="flex items-center gap-3 px-4 py-2 text-sm text-black/75 dark:text-white/75 font-bold"
              >
                <div className="w-2.5 h-2.5 bg-black dark:bg-white flex-shrink-0" />
                <span className="truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 space-y-1">
        <button
          onClick={toggleDarkMode}
          className="sidebar-link w-full cursor-pointer"
          id="dark-mode-toggle"
        >
          {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button onClick={handleLogout} className="sidebar-link w-full text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer animate-fade-in" id="logout-btn">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <StaggeredMenu
      position="right"
      items={menuItems}
      socialItems={socialItems}
      displaySocials={true}
      displayItemNumbering={true}
      isFixed={true}
      menuButtonColor={isDark ? '#ffffff' : '#000000'}
      openMenuButtonColor={isDark ? '#ffffff' : '#000000'}
      changeMenuColorOnOpen={true}
      colors={isDark ? ['#1e1b4b', '#311042'] : ['#facc15', '#e9d5ff']}
      logoUrl="" // Empty to show text branding '[TF]'
      accentColor="#facc15"
    />
  );
};

export default Sidebar;
