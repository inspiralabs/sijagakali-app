import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'public';

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  role: 'public',
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('sja_auth') === 'true';
  });

  const login = (email: string, password: string) => {
    // Mock login
    if (email && password) {
      setIsLoggedIn(true);
      sessionStorage.setItem('sja_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('sja_auth');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, role: isLoggedIn ? 'admin' : 'public', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
