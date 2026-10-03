import { create } from "zustand";
interface AuthState {
  user: { id: string; email?: string } | null;
  initialized: boolean;
  recovery: boolean;
  setAuth: (patch: Partial<Omit<AuthState, "setAuth">>) => void;
}
export const useAuthStore = create<AuthState>((set) => ({ user: null, initialized: false, recovery: false, setAuth: (patch) => set(patch) }));
