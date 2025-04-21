import { useCallback, useEffect, useState } from "react";
// 讓useLocalStorage變generic
export const useLocalStorage = <T>(
  key: string,
  defaultValue: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] => {
  const [value, setValue] = useState<T>(() => {
    const jsonValue = window.localStorage.getItem(key);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue) as T;
    }
    return defaultValue instanceof Function ? defaultValue() : defaultValue;
  });

  useEffect(() => {
    if (value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);
  // clean up the key-value pair in localStorage when user exit the page
  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
  }, [key]);

  return [value, setValue, removeValue];
};
