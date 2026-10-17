import React, { createContext, useContext, useState } from 'react';

export type DensityMode = 'comfortable' | 'compact';

export interface DensityContextValue {
  density: DensityMode;
  isCompact: boolean;
  isFocusMode: boolean;
  toggleDensity: () => void;
  setDensity: (mode: DensityMode) => void;
  toggleFocusMode: () => void;
}

const DensityContext = createContext<DensityContextValue>({
  density: 'comfortable',
  isCompact: false,
  isFocusMode: false,
  toggleDensity: () => {},
  setDensity: () => {},
  toggleFocusMode: () => {},
});

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  const toggleDensity = () => {
    setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));
  };

  const toggleFocusMode = () => {
    setIsFocusMode((prev) => !prev);
  };

  return (
    <DensityContext.Provider
      value={{
        density,
        isCompact: density === 'compact',
        isFocusMode,
        toggleDensity,
        setDensity,
        toggleFocusMode,
      }}
    >
      {children}
    </DensityContext.Provider>
  );
};

export function useDensity(): DensityContextValue {
  return useContext(DensityContext);
}
