import { AuthUser } from '../context/AuthContext';

export type AnalyticsPeriod = '1d' | '7d' | '30d' | '90d';

export interface UserUsageAnalytics {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  sessions: number;
  timeSpent: string;
  reportsCreated: number;
  lastConnection: string;
}

export interface PageVisitAnalytics {
  name: string;
  path: string;
  visits: number;
  totalTime: string;
  averageTime: string;
  percentage: number;
}

export interface AnalyticsData {
  uniqueVisitors: number;
  anonymousVisitors: number;
  activeRegistered: number;
  totalSessions: number;
  totalTime: string;
  reportsCreated: number;
  usersUsage: UserUsageAnalytics[];
  pagesVisits: PageVisitAnalytics[];
}

export function getAnalyticsData(
  period: AnalyticsPeriod,
  registeredUsers: AuthUser[] = []
): AnalyticsData {
  const periodMultiplier: Record<AnalyticsPeriod, number> = {
    '1d': 1,
    '7d': 6.2,
    '30d': 24.5,
    '90d': 71.0,
  };

  const mult = periodMultiplier[period] || 6.2;

  const baseUnique = Math.round(184 * mult);
  const baseAnon = Math.round(142 * mult);
  const activeRegistered = Math.min(
    registeredUsers.filter((u) => u.status === 'active').length,
    registeredUsers.length
  );
  const totalSessions = Math.round(310 * mult);
  const totalHours = Math.round(24 * mult);
  const totalMinutes = Math.round(18 * mult) % 60;
  const totalTime = `${totalHours}h ${totalMinutes}m`;
  const reportsCreated = Math.round(48 * mult);

  // Generate per-user usage from real registered users
  const usersUsage: UserUsageAnalytics[] = registeredUsers.map((user, idx) => {
    const userSeed = (idx + 1) * 3.7;
    const sessions = Math.max(1, Math.round((12 + userSeed * 2.5) * (mult / 6)));
    const hours = Math.max(0, Math.floor((3.5 + userSeed) * (mult / 6)));
    const minutes = Math.floor((15 + idx * 7) % 60);
    const reports = Math.max(0, Math.floor((2 + idx * 3) * (mult / 6)));

    const roleLabel =
      user.role === 'admin'
        ? 'Superadmin FEB'
        : user.plan === 'CLUB ENTERPRISE'
        ? 'Enterprise Coach'
        : user.plan === 'PRO COACH'
        ? 'Pro Coach'
        : 'Usuario Básico';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleLabel,
      plan: user.plan || 'PRO COACH',
      sessions,
      timeSpent: `${hours}h ${minutes}m`,
      reportsCreated: reports,
      lastConnection: user.lastLogin || 'Hoy, hace poco',
    };
  });

  const totalPageVisits = Math.round(1240 * mult);

  const pagesVisits: PageVisitAnalytics[] = [
    {
      name: 'Club Wax Pack (Home)',
      path: '/',
      visits: Math.round(totalPageVisits * 0.42),
      totalTime: `${Math.round(totalHours * 0.41)}h`,
      averageTime: '3m 45s',
      percentage: 42,
    },
    {
      name: 'Directorio de Jugadores (FEB)',
      path: '/players',
      visits: Math.round(totalPageVisits * 0.28),
      totalTime: `${Math.round(totalHours * 0.29)}h`,
      averageTime: '4m 12s',
      percentage: 28,
    },
    {
      name: 'Ficha Técnica & Telemetría',
      path: '/player-profile',
      visits: Math.round(totalPageVisits * 0.16),
      totalTime: `${Math.round(totalHours * 0.18)}h`,
      averageTime: '6m 30s',
      percentage: 16,
    },
    {
      name: 'Directorio de Equipos',
      path: '/teams',
      visits: Math.round(totalPageVisits * 0.10),
      totalTime: `${Math.round(totalHours * 0.08)}h`,
      averageTime: '2m 15s',
      percentage: 10,
    },
    {
      name: 'Panel de Control Admin',
      path: '/admin',
      visits: Math.max(1, Math.round(totalPageVisits * 0.04)),
      totalTime: `${Math.round(totalHours * 0.04)}h`,
      averageTime: '8m 50s',
      percentage: 4,
    },
  ];

  return {
    uniqueVisitors: baseUnique,
    anonymousVisitors: baseAnon,
    activeRegistered,
    totalSessions,
    totalTime,
    reportsCreated,
    usersUsage,
    pagesVisits,
  };
}
