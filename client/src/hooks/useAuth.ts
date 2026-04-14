import { useState, useEffect, useCallback } from 'react';
import { login as apiLogin } from '../lib/api';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('variant_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem('variant_token', data.token);
      localStorage.setItem('variant_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch {
      setError('Invalid credentials');
      throw new Error('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('variant_token');
    localStorage.removeItem('variant_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('variant_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  return { user, isLoading, error, login, logout, isAuthenticated: !!user };
}
