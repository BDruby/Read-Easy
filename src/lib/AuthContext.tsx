'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
  username: string;
  displayName: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: (callback?: () => void) => void;
  closeLoginModal: () => void;
  login: (username: string, password: string, captcha: string, captchaKey: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  isLoading: true,
  isLoginModalOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  login: async () => ({ success: false }),
  logout: async () => {},
  checkSession: async () => {},
});

export const TOKEN_STORAGE_KEY = 'writercraft_reviewer_auth_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [onLoginSuccessCallback, setOnLoginSuccessCallback] = useState<(() => void) | null>(null);

  // Setup automatic Authorization header injection for /api requests
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Guard against multiple patches
    const win = window as any;
    if (win.__fetch_patched_for_auth) return;
    win.__fetch_patched_for_auth = true;

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const urlStr = typeof input === 'string' 
          ? input 
          : input instanceof URL 
            ? input.toString() 
            : input.url;

        const isApi = urlStr.startsWith('/api') || urlStr.startsWith(window.location.origin + '/api');

        if (token && isApi) {
          init = init || {};
          const headers = new Headers(init.headers || (typeof input === 'object' && 'headers' in input ? input.headers : undefined));
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init.headers = headers;
        }
      } catch {
        // Ignore storage or header parsing issues
      }

      return originalFetch(input, init);
    };
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', {
        headers,
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.data?.isLoggedIn) {
        setIsLoggedIn(true);
        setUser(data.data.user);
      } else {
        setIsLoggedIn(false);
        setUser(null);
        if (token && data.success && !data.data?.isLoggedIn) {
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {}
        }
      }
    } catch {
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const openLoginModal = (callback?: () => void) => {
    if (callback) {
      setOnLoginSuccessCallback(() => callback);
    } else {
      setOnLoginSuccessCallback(null);
    }
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setOnLoginSuccessCallback(null);
  };

  const login = async (username: string, password: string, captcha: string, captchaKey: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha, captchaKey }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.token) {
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, data.data.token);
          } catch {}
        }

        setIsLoggedIn(true);
        setUser({
          username: data.data.username,
          displayName: data.data.displayName,
        });
        setIsLoginModalOpen(false);

        // Execute post-login callback if registered
        if (onLoginSuccessCallback) {
          setTimeout(() => {
            onLoginSuccessCallback();
            setOnLoginSuccessCallback(null);
          }, 100);
        }
        return { success: true };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch (e: any) {
      return { success: false, message: e.message || '网络请求异常' };
    }
  };

  const logout = async () => {
    try {
      const token = getStoredToken();
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}

      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } finally {
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        isLoading,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
