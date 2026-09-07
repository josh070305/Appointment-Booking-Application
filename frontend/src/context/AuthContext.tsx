import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: (email?: string, name?: string) => Promise<void>;
  switchUser: (email: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_PROFILES = [
  { name: 'Alex Johnson', email: 'demo.user@example.com', role: 'user', avatar: '👨‍💼', desc: 'Primary User' },
  { name: 'Jane Doe', email: 'jane.doe@example.com', role: 'user', avatar: '👩‍⚕️', desc: 'Concurrent User B' },
  { name: 'Dr. Sarah Smith', email: 'sarah.smith@example.com', role: 'admin', avatar: '👩‍🔬', desc: 'Medical Provider' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const performDemoLogin = async (email: string, name: string) => {
    try {
      const res = await api.demoLogin({ email, name });
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    } catch (err) {
      console.error('Demo login failed:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (isMounted) {
            setUser(res.user);
            setToken(storedToken);
            setIsLoading(false);
          }
          return;
        } catch {
          // Stale token from prior server session, clear and re-login demo
          localStorage.removeItem('token');
        }
      }

      // Auto login default demo user
      await performDemoLogin('demo.user@example.com', 'Alex Johnson');
      if (isMounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const demoLogin = async (email?: string, name?: string) => {
    setIsLoading(true);
    await performDemoLogin(email || 'demo.user@example.com', name || 'Alex Johnson');
    setIsLoading(false);
  };

  const switchUser = async (email: string, name: string) => {
    setIsLoading(true);
    await performDemoLogin(email, name);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        demoLogin,
        switchUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
