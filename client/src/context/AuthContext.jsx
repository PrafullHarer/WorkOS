import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);

      // Apply user dark mode preference
      if (data.user.preferences?.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    setUser(data.user);

    if (data.user.preferences?.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    }

    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const { data } = await authAPI.updateProfile(profileData);
    setUser(data.user);
    return data;
  };

  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !document.documentElement.classList.contains('dark');

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(newDarkMode));

    if (user) {
      try {
        await authAPI.updateProfile({
          preferences: { darkMode: newDarkMode },
        });
        setUser((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, darkMode: newDarkMode },
        }));
      } catch {
        // Silently fail - local state is still updated
      }
    }
  }, [user]);

  const deleteAccount = async () => {
    await authAPI.deleteAccount();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        toggleDarkMode,
        deleteAccount,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
