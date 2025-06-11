
import { useState, useEffect } from 'react';

// Custom hook to manage state with localStorage persistence
export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Persists the new value to localStorage when storedValue changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
         console.warn(`Error setting localStorage key "${key}" during stringify or setItem:`, error);
      }
    }
  }, [key, storedValue]);


  // Return a wrapped version of useState's setter function that ...
  // ... influences the storedValue, which in turn triggers the useEffect for persistence.
  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      // This now correctly passes functional updates to React's own state setter.
      setStoredValue(value);
    } catch (error) {
      // This error would likely be from React internal if `value` is problematic,
      // as direct localStorage interaction is removed from here.
      console.warn(`Error invoking React state setter for key "${key}":`, error);
    }
  };

  // Listen to storage events to sync state across tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
