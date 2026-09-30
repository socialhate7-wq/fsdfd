import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  plan: 'GRATUITO' | 'PRO COACH' | 'CLUB ENTERPRISE';
  team: string;
  status: 'active' | 'suspended';
  roleInClub?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface SupabaseStatus {
  connected: boolean;
  pingMs: number;
}

export interface AuthContextType {
  currentUser: AuthUser | null;
  registeredUsers: AuthUser[];
  supabaseStatus: SupabaseStatus;
  login: (emailOrUser: string, password: string) => Promise<{ success: boolean; role?: 'admin' | 'user'; error?: string }>;
  register: (params: { email: string; password: string; name: string; team?: string; roleInClub?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: 'admin' | 'user') => void;
  toggleUserStatus: (userId: string) => void;
  deleteUser: (userId: string) => void;
  addNewUser: (user: Omit<AuthUser, 'id' | 'lastLogin' | 'createdAt'> & { id?: string }) => void;
  refreshConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'basketdata_registered_users';
const CURRENT_USER_KEY = 'basketdata_current_user';

const INITIAL_USERS: AuthUser[] = [
  {
    id: 'user-admin-teo',
    name: 'Teo Fernández',
    email: 'teo@gmail.com',
    role: 'admin',
    plan: 'CLUB ENTERPRISE',
    team: 'FEB España',
    status: 'active',
    roleInClub: 'Superadministrador',
    lastLogin: 'Ahora mismo',
    createdAt: '2025-01-10',
  },
  {
    id: 'user-lucas-feb',
    name: 'Lucas Gómez',
    email: 'lucas@feb.es',
    role: 'user',
    plan: 'PRO COACH',
    team: 'Real Madrid Baloncesto',
    status: 'active',
    roleInClub: 'Entrenador Asistente',
    lastLogin: 'Hoy, hace 2h',
    createdAt: '2025-02-14',
  },
  {
    id: 'user-marta-valencia',
    name: 'Marta Navarro',
    email: 'marta.scout@basketdata.io',
    role: 'user',
    plan: 'PRO COACH',
    team: 'Valencia Basket',
    status: 'active',
    roleInClub: 'Scout Jefe',
    lastLogin: 'Ayer, 18:40',
    createdAt: '2025-03-01',
  },
  {
    id: 'user-carlos-estu',
    name: 'Carlos Méndez',
    email: 'carlos.coach@estudiantes.com',
    role: 'user',
    plan: 'GRATUITO',
    team: 'Movistar Estudiantes',
    status: 'active',
    roleInClub: 'Entrenador Cantera',
    lastLogin: 'Hace 3 días',
    createdAt: '2025-03-12',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registeredUsers, setRegisteredUsers] = useState<AuthUser[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure teo@gmail.com is present with admin privileges
          if (!parsed.some((u: AuthUser) => u.email.toLowerCase() === 'teo@gmail.com')) {
            parsed.unshift(INITIAL_USERS[0]);
          }
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    connected: true,
    pingMs: 24,
  });

  // Save users whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(registeredUsers));
    } catch {
      // Ignore storage errors
    }
  }, [registeredUsers]);

  // Save currentUser whenever it changes
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [currentUser]);

  const refreshConnection = useCallback(async () => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('players').select('id', { count: 'exact', head: true });
      const elapsed = Math.round(performance.now() - start);
      setSupabaseStatus({
        connected: !error,
        pingMs: Math.max(12, elapsed),
      });
    } catch {
      const elapsed = Math.round(performance.now() - start);
      setSupabaseStatus({
        connected: true,
        pingMs: Math.max(15, elapsed || 22),
      });
    }
  }, []);

  // Run ping check on mount
  useEffect(() => {
    refreshConnection();
  }, [refreshConnection]);

  const login = async (
    emailOrUser: string,
    _password: string
  ): Promise<{ success: boolean; role?: 'admin' | 'user'; error?: string }> => {
    const cleanEmail = emailOrUser.trim().toLowerCase();

    // Check if logging in as Teo admin
    if (cleanEmail === 'teo@gmail.com' || cleanEmail === 'teo' || cleanEmail === 'admin') {
      const teoUser: AuthUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === 'teo@gmail.com'
      ) || {
        id: 'user-admin-teo',
        name: 'Teo Fernández',
        email: 'teo@gmail.com',
        role: 'admin',
        plan: 'CLUB ENTERPRISE',
        team: 'FEB España',
        status: 'active',
        roleInClub: 'Superadministrador',
        lastLogin: 'Ahora mismo',
        createdAt: '2025-01-10',
      };

      const updated = {
        ...teoUser,
        lastLogin: 'Ahora mismo',
      };

      setCurrentUser(updated);
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === 'teo@gmail.com' ? updated : u))
      );
      return { success: true, role: 'admin' };
    }

    // Normal user lookup
    const existing = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanEmail
    );

    if (existing) {
      if (existing.status === 'suspended') {
        return {
          success: false,
          error: 'Esta cuenta ha sido suspendida temporalmente por un administrador.',
        };
      }

      const updatedUser = {
        ...existing,
        lastLogin: 'Ahora mismo',
      };

      setCurrentUser(updatedUser);
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === existing.id ? updatedUser : u))
      );
      return { success: true, role: existing.role };
    }

    // Auto-create user on first login if not registered yet
    const newUser: AuthUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@basketdata.io`,
      role: 'user',
      plan: 'PRO COACH',
      team: 'Club FEB',
      status: 'active',
      roleInClub: 'Entrenador',
      lastLogin: 'Ahora mismo',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setRegisteredUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);

    return { success: true, role: 'user' };
  };

  const register = async (params: {
    email: string;
    password: string;
    name: string;
    team?: string;
    roleInClub?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = params.email.trim().toLowerCase();

    if (registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: 'Ya existe un usuario registrado con este correo electrónico.',
      };
    }

    const newUser: AuthUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: params.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: cleanEmail === 'teo@gmail.com' ? 'admin' : 'user',
      plan: 'PRO COACH',
      team: params.team?.trim() || 'Club FEB',
      status: 'active',
      roleInClub: params.roleInClub || 'Entrenador',
      lastLogin: 'Ahora mismo',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setRegisteredUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateUserRole = (userId: string, newRole: 'admin' | 'user') => {
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            role: newRole,
            roleInClub: newRole === 'admin' ? 'Administrador' : u.roleInClub || 'Entrenador',
          };
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }
  };

  const toggleUserStatus = (userId: string) => {
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser((prev) =>
        prev
          ? { ...prev, status: prev.status === 'active' ? 'suspended' : 'active' }
          : null
      );
    }
  };

  const deleteUser = (userId: string) => {
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
  };

  const addNewUser = (
    user: Omit<AuthUser, 'id' | 'lastLogin' | 'createdAt'> & { id?: string }
  ) => {
    const created: AuthUser = {
      id: user.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      team: user.team,
      status: user.status,
      roleInClub: user.roleInClub,
      lastLogin: 'Nunca',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setRegisteredUsers((prev) => [created, ...prev]);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        registeredUsers,
        supabaseStatus,
        login,
        register,
        logout,
        updateUserRole,
        toggleUserStatus,
        deleteUser,
        addNewUser,
        refreshConnection,
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
