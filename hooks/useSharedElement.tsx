import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LayoutRectangle } from 'react-native';

type Product = {
  _id: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating?: number;
};

interface SharedElementContextProps {
  sharedElement: {
    item: Product | null;
    sourceLayout: LayoutRectangle | null;
  };
  setSharedElement: (item: Product | null, sourceLayout: LayoutRectangle | null) => void;
}

const SharedElementContext = createContext<SharedElementContextProps | undefined>(undefined);

export const SharedElementProvider = ({ children }: { children: ReactNode }) => {
  type SharedElementState = { item: Product | null; sourceLayout: LayoutRectangle | null };
  const [sharedElement, setSharedElementState] = useState<SharedElementState>({ item: null, sourceLayout: null });

  const setSharedElement = (item: Product | null, sourceLayout: LayoutRectangle | null) => {
    setSharedElementState({ item, sourceLayout });
  };

  return (
    <SharedElementContext.Provider value={{ sharedElement, setSharedElement }}>
      {children}
    </SharedElementContext.Provider>
  );
};

export const useSharedElement = () => {
  const context = useContext(SharedElementContext);
  if (!context) {
    throw new Error('useSharedElement must be used within a SharedElementProvider');
  }
  return context;
};