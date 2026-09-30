import React, { useState } from 'react';
import { WaxPackClubPage } from './components/WaxPackClubPage';
import { PlayerProfilePage } from './components/PlayerProfilePage';
import { PlayersDirectoryPage } from './components/PlayersDirectoryPage';
import { TeamsDirectoryPage } from './components/TeamsDirectoryPage';
import { AdminPanelPage } from './components/AdminPanelPage';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'home' | 'players' | 'teams' | 'player-profile' | 'admin'>('home');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('1002585');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | undefined>(undefined);

  // No-op function so no floating bottom-right notifications appear
  const showToast = (_message?: string) => {};

  const handleOpenPlayerProfile = (pId?: string) => {
    if (pId) setSelectedPlayerId(pId);
    setCurrentPage('player-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToPlayers = (teamName?: string) => {
    setSelectedTeamFilter(teamName);
    setCurrentPage('players');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToTeams = () => {
    setCurrentPage('teams');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#ede7dc] text-[#0e3a73] relative">
      {currentPage === 'home' && (
        <WaxPackClubPage
          onShowToast={showToast}
          onOpenPlayerProfile={handleOpenPlayerProfile}
          onNavigateToPlayers={() => handleNavigateToPlayers(undefined)}
          onNavigateToTeams={handleNavigateToTeams}
          onOpenAdminPanel={() => {
            setCurrentPage('admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {currentPage === 'players' && (
        <PlayersDirectoryPage
          initialTeamFilter={selectedTeamFilter}
          onBackToHome={handleBackToHome}
          onOpenPlayerProfile={handleOpenPlayerProfile}
          onNavigateToTeams={handleNavigateToTeams}
          onShowToast={showToast}
        />
      )}

      {currentPage === 'teams' && (
        <TeamsDirectoryPage
          onBackToHome={handleBackToHome}
          onNavigateToPlayersWithTeam={(teamName) => handleNavigateToPlayers(teamName === 'ALL' ? undefined : teamName)}
          onOpenPlayerProfile={handleOpenPlayerProfile}
          onShowToast={showToast}
        />
      )}

      {currentPage === 'player-profile' && (
        <PlayerProfilePage
          playerId={selectedPlayerId}
          onSelectPlayer={(pId: string) => setSelectedPlayerId(pId)}
          onBackToHome={handleBackToHome}
          onNavigateToPlayers={() => handleNavigateToPlayers(undefined)}
          onNavigateToTeams={handleNavigateToTeams}
          onShowToast={showToast}
          onOpenChecklistModal={handleBackToHome}
        />
      )}

      {currentPage === 'admin' && (
        <AdminPanelPage
          onBackToHome={handleBackToHome}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
