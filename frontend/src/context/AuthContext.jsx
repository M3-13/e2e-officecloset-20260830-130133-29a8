import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as authApi from '../api/auth.js';
import { getToken, setToken as persistToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const login = async ({ email, password }) => {
    const data = await authApi.login({ email, password });
    persistToken(data.access_token);
    setToken(data.access_token);
    setUser({ email });
    return data;
  };

  const register = async ({ email, password }) => {
    const data = await authApi.register({ email, password });
    persistToken(data.access_token);
    setToken(data.access_token);
    setUser({ email });
    return data;
  };

  const logout = () => {
    persistToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
