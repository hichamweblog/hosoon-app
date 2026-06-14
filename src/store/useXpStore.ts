import { create } from 'zustand';

interface XpEvent {
  id: number;
  amount: number;
  x: number;
  y: number;
}

interface XpStore {
  events: XpEvent[];
  addEvent: (amount: number, x: number, y: number) => void;
  removeEvent: (id: number) => void;
}

export const useXpStore = create<XpStore>((set) => ({
  events: [],
  addEvent: (amount, x, y) => set((state) => ({ 
    events: [...state.events, { id: Date.now() + Math.random(), amount, x, y }] 
  })),
  removeEvent: (id) => set((state) => ({ 
    events: state.events.filter(e => e.id !== id) 
  }))
}));
