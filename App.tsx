
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import GameSetupPage from './pages/GameSetupPage';
import GamePage from './pages/GamePage';
import HistoryPage from './pages/HistoryPage';
import RosterManagementPage from './pages/RosterManagementPage';
import HelpPage from './pages/HelpPage'; // Import HelpPage
import DropdownMenu from './components/DropdownMenu';
import GoBackButton from './components/GoBackButton'; // Import GoBackButton
import { Player, Game, GamePhase, Team } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from './constants';
import {
  EllipsisVerticalIcon,
  StartIcon,
  BasketballIcon,
  UsersIcon,
  ClockIcon,
  SignOutIcon,
  QuestionIcon, // Import QuestionIcon
  LiveGameIcon, // Import LiveGameIcon
  advanceGameTime, // Import the game logic utility
  formatTime, // Import formatTime
} from './utils';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      window.scrollTo(0, 0);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  return null;
};

const EnsureInitialRoute: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasCheckedRouteRef = useRef(false);

  useEffect(() => {
    if (!hasCheckedRouteRef.current) {
      if (location.pathname === '/home' || location.pathname === '/home/') {
        navigate('/', { replace: true });
      }
      hasCheckedRouteRef.current = true;
    }
  }, [location, navigate]);

  return null;
};

interface AppLayoutProps {
  menuItems: { path: string; label: string; icon: React.ReactNode }[];
  playersRoster: Player[];
  addPlayerToRoster: (player: Omit<Player, 'id' | 'position'> & { position?: string }) => void;
  updatePlayerInRoster: (updatedPlayer: Player) => void;
  deletePlayerFromRoster: (playerId: string) => void;
  reorderPlayersInRoster: (newRoster: Player[]) => void;
  teams: Team[];
  addTeam: (name: string) => void;
  updateTeamName: (teamId: string, newName: string) => void;
  deleteTeam: (teamId: string) => void;
  assignPlayersToTeam: (teamId: string, newPlayerIds: string[]) => void;
  currentGame: Game | null;
  setCurrentGame: React.Dispatch<React.SetStateAction<Game | null>>;
  saveCompletedGame: (game: Game) => void;
  gameHistory: Game[];
  deleteGameFromHistory: (gameId: string) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  menuItems,
  playersRoster,
  addPlayerToRoster,
  updatePlayerInRoster,
  deletePlayerFromRoster,
  reorderPlayersInRoster,
  teams,
  addTeam,
  updateTeamName,
  deleteTeam,
  assignPlayersToTeam,
  currentGame,
  setCurrentGame,
  saveCompletedGame,
  gameHistory,
  deleteGameFromHistory
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const showTopButtons = location.pathname !== '/';
  const showBackButton = showTopButtons && location.pathname !== '/home'; // Back button not shown on /home
  const showHomeButton = showBackButton; // Home button shown when back button is shown
  
  const showGameInProgressButton = 
    showTopButtons && 
    currentGame && 
    currentGame.gamePhase !== GamePhase.FINISHED && 
    location.pathname !== '/game';

  // Helper to determine if the phase is one where a timer is actively counting or could be (e.g., paused timeout)
  const shouldDisplayLiveTime = (game: Game | null): boolean => {
    if (!game) return false;
    return [
      GamePhase.IN_PROGRESS,
      GamePhase.WARMUP,
      GamePhase.QUARTER_BREAK,
      GamePhase.HALFTIME,
      GamePhase.OVERTIME_BREAK,
      GamePhase.TIMEOUT, // Show paused time during timeout
    ].includes(game.gamePhase);
  };

  return (
    <>
      {(showBackButton || showHomeButton || showGameInProgressButton) && (
        <div className="fixed top-4 left-4 z-40 flex items-center space-x-2">
          {showBackButton && <GoBackButton />}
          {showHomeButton && (
             <button
              onClick={() => navigate('/home')}
              className="flex items-center text-white p-2 rounded-full bg-brand-surface hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent shadow-md"
              aria-label="Ir a Inicio"
            >
              <StartIcon className="w-5 h-5" />
            </button>
          )}
          {showGameInProgressButton && currentGame && (
            <>
              <button
                onClick={() => navigate('/game')}
                className="flex items-center text-white p-2 rounded-md bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-md text-sm"
                aria-label="Ir al partido en curso"
              >
                <LiveGameIcon className="w-5 h-5 mr-1.5" />
                Partido en Curso
              </button>
              {shouldDisplayLiveTime(currentGame) && (
                <span 
                  className="text-white text-sm font-mono bg-slate-700 px-2 py-1 rounded-md shadow-md"
                  aria-label="Tiempo de juego actual"
                >
                  {formatTime(Math.max(0, currentGame.currentTimeRemainingInPhase))}
                </span>
              )}
            </>
          )}
        </div>
      )}
      {showTopButtons && (
        <div className="fixed top-4 right-4 z-40">
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="text-white p-2 rounded-full bg-brand-surface hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Abrir menú de navegación"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              id="menu-button"
            >
              <EllipsisVerticalIcon className="w-6 h-6" />
            </button>
            <DropdownMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              menuItems={menuItems}
              triggerRef={menuButtonRef}
            />
          </div>
        </div>
      )}
      <main className="flex-grow container mx-auto px-4 py-6 pt-20"> {/* Added pt-20 for top padding */}
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage currentGame={currentGame} />} />
          <Route
            path="/setup"
            element={
              <GameSetupPage
                roster={playersRoster}
                onGameSetup={setCurrentGame}
                currentGame={currentGame}
                teams={teams}
              />
            }
          />
          <Route
            path="/game"
            element={
              <GamePage
                gameData={currentGame}
                setGameData={setCurrentGame}
                onGameEnd={saveCompletedGame}
                roster={playersRoster}
              />
            }
          />
          <Route
            path="/history"
            element={
              <HistoryPage
                gameHistory={gameHistory}
                onDeleteGame={deleteGameFromHistory}
              />
            }
          />
          <Route
            path="/roster"
            element={
              <RosterManagementPage
                players={playersRoster}
                onAddPlayer={addPlayerToRoster}
                onUpdatePlayer={updatePlayerInRoster}
                onDeletePlayer={deletePlayerFromRoster}
                onReorderPlayers={reorderPlayersInRoster}
                teams={teams}
                onAddTeam={addTeam}
                onUpdateTeamName={updateTeamName}
                onDeleteTeam={deleteTeam}
                onAssignPlayersToTeam={assignPlayersToTeam}
              />
            }
          />
          <Route path="/help" element={<HelpPage />} /> {/* Add HelpPage Route */}
        </Routes>
      </main>
    </>
  );
};

const App: React.FC = () => {
  const [playersRoster, setPlayersRoster] = useLocalStorage<Player[]>(LOCAL_STORAGE_KEYS.PLAYERS_ROSTER, []);
  const [gameHistory, setGameHistory] = useLocalStorage<Game[]>(LOCAL_STORAGE_KEYS.GAME_HISTORY, []);
  const [currentGame, setCurrentGame] = useLocalStorage<Game | null>(LOCAL_STORAGE_KEYS.CURRENT_GAME, null);
  const [teams, setTeams] = useLocalStorage<Team[]>(LOCAL_STORAGE_KEYS.TEAMS, []);

  const intervalRef = useRef<number | null>(null);

  const isPhaseWithRunningTimer = useCallback((phase: GamePhase | undefined): boolean => {
    if (!phase) return false;
    return [
      GamePhase.IN_PROGRESS,
      GamePhase.WARMUP,
      GamePhase.QUARTER_BREAK,
      GamePhase.HALFTIME,
      GamePhase.OVERTIME_BREAK,
    ].includes(phase);
  }, []);
  
  useEffect(() => {
    const processGameTick = (gameToProcess: Game): Game => {
      const now = Date.now();
      let elapsedSeconds = 1; // Default to 1 second for regular ticks
  
      if (gameToProcess.lastTickTimestamp) {
        elapsedSeconds = (now - gameToProcess.lastTickTimestamp) / 1000;
      }
      
      // Ensure elapsedSeconds is at least 1 for very fast successive calls or if tab was backgrounded.
      // Or, for more precision with backgrounding, let it be the actual elapsed time.
      // For simplicity, we can cap it or just use the calculated elapsed time.
      // Let's use the calculated elapsed time, but ensure it's not excessively large on first load after long inactivity.
      // If elapsedSeconds is very large (e.g., > 5 minutes), maybe just advance by a smaller chunk or show a "catch-up" message.
      // For now, we'll use the calculated time.

      if (elapsedSeconds <= 0) elapsedSeconds = 0.01; // ensure some time passes if called too quickly
  
      const updatedGame = advanceGameTime(gameToProcess, elapsedSeconds);
      return { ...updatedGame, lastTickTimestamp: now };
    };

    if (currentGame && currentGame.timerIsRunning && isPhaseWithRunningTimer(currentGame.gamePhase)) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // If app was closed and reopened, "catch up" the time
      if (currentGame.lastTickTimestamp) {
          const timeSinceLastTick = Date.now() - currentGame.lastTickTimestamp;
          if (timeSinceLastTick > 2000) { // If more than 2s passed (e.g. tab inactive)
              const caughtUpGame = processGameTick(currentGame);
              // Directly set the caught-up state without waiting for the next interval
              // This avoids a potentially large jump if setCurrentGame was only in the interval
              setCurrentGame(caughtUpGame); 
              // The interval will continue from this new state.
          }
      } else {
         // First time timer is starting for this game or after a pause without a tick
         setCurrentGame(prev => prev ? {...prev, lastTickTimestamp: Date.now()} : null);
      }

      intervalRef.current = window.setInterval(() => {
        setCurrentGame(prevGame => {
          if (prevGame && prevGame.timerIsRunning && isPhaseWithRunningTimer(prevGame.gamePhase)) {
            return processGameTick(prevGame);
          } else {
            // Timer should stop
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            return prevGame; // Return previous state if no update needed
          }
        });
      }, 1000);

    } else {
      // Timer should not be running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => { // Cleanup on component unmount or if dependencies change leading to re-run
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentGame, setCurrentGame, isPhaseWithRunningTimer]);


  const menuItems = [
    { path: "/home", label: "Inicio", icon: <StartIcon /> },
    { path: "/game", label: "Partido", icon: <BasketballIcon /> },
    { path: "/roster", label: "Jugadores", icon: <UsersIcon /> },
    { path: "/history", label: "Historial", icon: <ClockIcon /> },
    { path: "/help", label: "Ayuda", icon: <QuestionIcon /> }, // Add Help menu item
    { path: "/", label: "Cerrar Sesión", icon: <SignOutIcon /> },
  ];

  const addPlayerToRoster = (player: Omit<Player, 'id' | 'position'> & { position?: string }) => {
    const newPlayer = { ...player, id: crypto.randomUUID(), position: player.position || "" };
    setPlayersRoster(prev => [...prev, newPlayer]);
  };

  const updatePlayerInRoster = (updatedPlayer: Player) => {
    setPlayersRoster(prev => prev.map(p => p.id === updatedPlayer.id ? { ...p, ...updatedPlayer, position: updatedPlayer.position || "" } : p));
  };

  const deletePlayerFromRoster = (playerId: string) => {
    setPlayersRoster(prev => prev.filter(p => p.id !== playerId));
    setTeams(prevTeams =>
      prevTeams.map(team => ({
        ...team,
        playerIds: team.playerIds.filter(id => id !== playerId)
      }))
    );
  };

  const reorderPlayersInRoster = (newRoster: Player[]) => {
    setPlayersRoster(newRoster);
  };

  const addTeam = (name: string) => {
    if (!name.trim()) {
      alert("El nombre del equipo no puede estar vacío."); return;
    }
    if (teams.some(team => team.name.toLowerCase() === name.trim().toLowerCase())) {
      alert("Ya existe un equipo con este nombre."); return;
    }
    const newTeam: Team = { id: crypto.randomUUID(), name: name.trim(), playerIds: [] };
    setTeams(prev => [...prev, newTeam]);
  };

  const updateTeamName = (teamId: string, newName: string) => {
    if (!newName.trim()) {
      alert("El nombre del equipo no puede estar vacío."); return;
    }
    if (teams.some(team => team.id !== teamId && team.name.toLowerCase() === newName.trim().toLowerCase())) {
      alert("Ya existe otro equipo con este nombre."); return;
    }
    setTeams(prev => prev.map(team => team.id === teamId ? { ...team, name: newName.trim() } : team));
  };

  const deleteTeam = (teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  };

  const assignPlayersToTeam = (teamId: string, newPlayerIds: string[]) => {
    setTeams(prev => prev.map(team => team.id === teamId ? { ...team, playerIds: newPlayerIds } : team));
  };

  const saveCompletedGame = (game: Game) => {
    const finalGame = { 
        ...game, 
        gamePhase: GamePhase.FINISHED, 
        endTime: new Date().toISOString(),
        timerIsRunning: false, // Ensure timer is stopped for finished game
        lastTickTimestamp: null 
    };
    setGameHistory(prev => [finalGame, ...prev]);
    setCurrentGame(null);
  };

  const deleteGameFromHistory = (gameId: string) => {
    setGameHistory(prev => prev.filter(game => game.id !== gameId));
  };

  return (
    <HashRouter>
      <ScrollToTop />
      <EnsureInitialRoute />
      <div className="bg-gradient-to-br from-gray-900 via-black to-red-900 min-h-screen flex flex-col overflow-x-hidden">
        <AppLayout
          menuItems={menuItems}
          playersRoster={playersRoster}
          addPlayerToRoster={addPlayerToRoster}
          updatePlayerInRoster={updatePlayerInRoster}
          deletePlayerFromRoster={deletePlayerFromRoster}
          reorderPlayersInRoster={reorderPlayersInRoster}
          teams={teams}
          addTeam={addTeam}
          updateTeamName={updateTeamName}
          deleteTeam={deleteTeam}
          assignPlayersToTeam={assignPlayersToTeam}
          currentGame={currentGame}
          setCurrentGame={setCurrentGame}
          saveCompletedGame={saveCompletedGame}
          gameHistory={gameHistory}
          deleteGameFromHistory={deleteGameFromHistory}
        />
      </div>
    </HashRouter>
  );
};

export default App;
