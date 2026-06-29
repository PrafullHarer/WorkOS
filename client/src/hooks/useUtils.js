import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debounced search
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for click outside detection
 */
export const useClickOutside = (callback) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);

  return ref;
};

/**
 * Custom hook for keyboard shortcuts
 */
export const useKeyboard = (key, callback, deps = []) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        callback(e);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, ...deps]);
};
