import React, { createContext, useContext, useState, useEffect } from 'react';

export type TableDensityMode = 'compact' | 'comfortable';

interface DensityContextType {
  density: TableDensityMode;
  setDensity: (mode: TableDensityMode) => void;
  toggleDensity: () => void;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  toggleFocusMode: () => void;
}

const DensityContext = createContext<DensityContextType>({
  density: 'comfortable',
  setDensity: () => {},
  toggleDensity: () => {},
  isFocusMode: false,
  setIsFocusMode: () => {},
  toggleFocusMode: () => {},
});

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<TableDensityMode>(() => {
    try {
      const saved = localStorage.getItem('mg_table_density');
      return (saved === 'compact' || saved === 'comfortable') ? saved : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const [isFocusMode, setIsFocusModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mg_focus_zen_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setDensity = (mode: TableDensityMode) => {
    setDensityState(mode);
    try {
      localStorage.setItem('mg_table_density', mode);
    } catch {}
  };

  const toggleDensity = () => {
    setDensity(density === 'compact' ? 'comfortable' : 'compact');
  };

  const setIsFocusMode = (val: boolean) => {
    setIsFocusModeState(val);
    try {
      localStorage.setItem('mg_focus_zen_mode', String(val));
    } catch {}
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  };

  return (
    <DensityContext.Provider
      value={{
        density,
        setDensity,
        toggleDensity,
        isFocusMode,
        setIsFocusMode,
        toggleFocusMode,
      }}
    >
      {children}
    </DensityContext.Provider>
  );
};

export const useDensity = () => useContext(DensityContext);
