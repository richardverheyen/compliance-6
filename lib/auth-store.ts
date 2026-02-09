import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          set({ isLoading: false });
          return { error: data.error };
        }
        set({ user: data, isLoading: false });
        return {};
      },

      signup: async (email, password, name) => {
        set({ isLoading: true });
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          set({ isLoading: false });
          return { error: data.error };
        }
        set({ user: data, isLoading: false });
        return {};
      },

      logout: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        set({ user: null });
      },

      setUser: (user) => set({ user }),
    }),
    { name: "auth-storage" },
  ),
);
