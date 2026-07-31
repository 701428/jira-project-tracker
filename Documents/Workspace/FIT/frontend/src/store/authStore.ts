import { create } from 'zustand';
import { login as apiLogin } from '../api/auth';
import { AUTH_TOKEN_KEY } from '../api/client';
import type { IUser } from '../types';

const USER_KEY = 'fit_auth_user';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
}

// Read persisted auth eagerly so PrivateRoute has the token on first render
const _storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
const _storedUser = (() => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as IUser | null; }
  catch { return null; }
})();

export const useAuthStore = create<AuthState>((set) => ({
  user: _storedToken ? _storedUser : null,
  token: _storedToken && _storedUser ? _storedToken : null,
  isLoading: false,
  error: null,

  init: () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as IUser;
        set({ token, user });
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      set({ user: response.user, token: response.token, isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, error: null });
  },
}));
