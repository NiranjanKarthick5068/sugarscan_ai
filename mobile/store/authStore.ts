/**
 * mobile/store/authStore.ts
 *
 * Auth powered by Supabase Auth (replaces custom FastAPI JWT).
 * Session is persisted automatically by the supabase-js client
 * via expo-secure-store adapter (configured in lib/supabase.ts).
 *
 * Onboarding state is still stored separately in SecureStore.
 */
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getStorageItem, setStorageItem, removeStorageItem } from '../lib/storage';

const ONBOARDING_KEY = 'sugarscan_onboarding_v2';

interface AuthState {
  // Supabase-native
  user:    User | null;
  session: Session | null;

  // Derived convenience flags
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;

  // Legacy aliases (some screens still reference these; kept for compat)
  accessToken:  string | null;
  refreshToken: string | null;

  // Actions
  setHasCompletedOnboarding: (val: boolean) => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:    null,
  session: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  isLoading: true,
  accessToken:  null,
  refreshToken: null,

  setHasCompletedOnboarding: async (val: boolean) => {
    await setStorageItem(ONBOARDING_KEY, JSON.stringify(val));
    set({ hasCompletedOnboarding: val });
  },

  loadStoredAuth: async () => {
    try {
      // Supabase auto-restores session from SecureStore; we just read it.
      const { data: { session } } = await supabase.auth.getSession();
      const onboardingRaw = await getStorageItem(ONBOARDING_KEY);
      const hasCompletedOnboarding = onboardingRaw === 'true';

      if (session) {
        set({
          session,
          user:            session.user,
          accessToken:     session.access_token,
          refreshToken:    session.refresh_token,
          isAuthenticated: true,
          hasCompletedOnboarding,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      // Listen for Supabase auth state changes (token refresh, sign-out, etc.)
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession) {
          set({
            session:         newSession,
            user:            newSession.user,
            accessToken:     newSession.access_token,
            refreshToken:    newSession.refresh_token,
            isAuthenticated: true,
          });
        } else {
          set({
            session:         null,
            user:            null,
            accessToken:     null,
            refreshToken:    null,
            isAuthenticated: false,
          });
        }
      });
    } catch (e) {
      console.error('[authStore] loadStoredAuth error:', e);
      set({ isLoading: false });
    }
  },

  clearAuth: async () => {
    await supabase.auth.signOut();
    await removeStorageItem(ONBOARDING_KEY);
    set({
      user:                   null,
      session:                null,
      accessToken:            null,
      refreshToken:           null,
      isAuthenticated:        false,
      hasCompletedOnboarding: false,
    });
  },

  updateUser: (updates) => {
    const { user } = get();
    if (user) {
      // Merge into local state — Supabase doesn't allow direct User mutation,
      // but we can store display overrides locally.
      set({ user: { ...user, ...updates } });
    }
  },
}));

// ── Convenience auth helpers used by login/register screens ──────────────────

export const supabaseSignIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const supabaseSignUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
};

export const supabaseSignOut = () => supabase.auth.signOut();
