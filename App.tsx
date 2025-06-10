
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import GameSetupPage from './pages/GameSetupPage';
import GamePage from './pages/GamePage';
import HistoryPage from './pages/HistoryPage';
import RosterManagementPage from './pages/RosterManagementPage';
import HelpPage from './pages/HelpPage'; 
import DropdownMenu from './components/DropdownMenu';
import GoBackButton from './components/GoBackButton'; 
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
  QuestionIcon, 
  LiveGameIcon, 
  SunIcon, // Import SunIcon
  MoonIcon, // Import MoonIcon
  advanceGameTime, 
  formatTime, 
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

type Theme = 'light' | 'dark';

interface AppLayoutProps {
  menuItems: { path?: string; label: string; icon: React.ReactNode; action?: () => void, isThemeToggle?: boolean }[]; // Allow action for theme toggle
  playersRoster: Player[];
  addPlayerToRoster: (player: Omit<Player, 'id' | 'position'> & { position?: string }) => void;
  addPlayersBatchToRoster: (playersData: Array<Omit<Player, 'id' | 'position'> & { position?: string }>) => void;
  updatePlayerInRoster: (updatedPlayer: Player) => void;
  deletePlayerFromRoster: (playerId: string) => void;
  reorderPlayersInRoster: (newRoster: Player[]) => void;
  teams: Team[];
  addTeam: (name: string, playerIds?: string[]) => void;
  updateTeamName: (teamId: string, newName: string) => void;
  deleteTeam: (teamId: string) => void;
  assignPlayersToTeam: (teamId: string, newPlayerIds: string[]) => void;
  currentGame: Game | null;
  setCurrentGame: React.Dispatch<React.SetStateAction<Game | null>>;
  saveCompletedGame: (game: Game) => void;
  gameHistory: Game[];
  deleteGameFromHistory: (gameId: string) => void;
  deleteMultipleGamesFromHistory: (gameIds: string[]) => void;
  currentTheme: Theme; // Add currentTheme
}

const AppLayout: React.FC<AppLayoutProps> = ({
  menuItems,
  playersRoster,
  addPlayerToRoster,
  addPlayersBatchToRoster,
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
  deleteGameFromHistory,
  deleteMultipleGamesFromHistory,
  currentTheme, // Destructure currentTheme
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const showTopButtons = location.pathname !== '/';
  const showBackButton = showTopButtons && location.pathname !== '/home';
  const showHomeButton = showBackButton; 
  
  const showGameInProgressButton = 
    showTopButtons && 
    currentGame && 
    currentGame.gamePhase !== GamePhase.FINISHED && 
    location.pathname !== '/game';

  const shouldDisplayLiveTime = (game: Game | null): boolean => {
    if (!game) return false;
    return [
      GamePhase.IN_PROGRESS,
      GamePhase.WARMUP,
      GamePhase.QUARTER_BREAK,
      GamePhase.HALFTIME,
      GamePhase.OVERTIME_BREAK,
      GamePhase.TIMEOUT,
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
              className="flex items-center text-brand-text-primary-light dark:text-brand-text-primary p-2 rounded-full bg-brand-surface-light dark:bg-brand-surface hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent shadow-md"
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
              className="text-brand-text-primary-light dark:text-brand-text-primary p-2 rounded-full bg-brand-surface-light dark:bg-brand-surface hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent"
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
              currentTheme={currentTheme} // Pass currentTheme
            />
          </div>
        </div>
      )}
      <main className="flex-grow container mx-auto px-4 py-6 pt-20">
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
                onDeleteMultipleGames={deleteMultipleGamesFromHistory}
              />
            }
          />
          <Route
            path="/roster"
            element={
              <RosterManagementPage
                players={playersRoster}
                onAddPlayer={addPlayerToRoster}
                onAddPlayersBatch={addPlayersBatchToRoster}
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
          <Route path="/help" element={<HelpPage />} />
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
  const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'dark'); // Theme state

  const intervalRef = useRef<number | null>(null);

  // Apply theme class to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

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
      let elapsedSeconds = 1; 
  
      if (gameToProcess.lastTickTimestamp) {
        elapsedSeconds = (now - gameToProcess.lastTickTimestamp) / 1000;
      }
      
      if (elapsedSeconds <= 0) elapsedSeconds = 0.01; 
  
      const updatedGame = advanceGameTime(gameToProcess, elapsedSeconds);
      return { ...updatedGame, lastTickTimestamp: now };
    };

    if (currentGame && currentGame.timerIsRunning && isPhaseWithRunningTimer(currentGame.gamePhase)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (currentGame.lastTickTimestamp) {
          const timeSinceLastTick = Date.now() - currentGame.lastTickTimestamp;
          if (timeSinceLastTick > 2000) { 
              const caughtUpGame = processGameTick(currentGame);
              setCurrentGame(caughtUpGame); 
          }
      } else {
         setCurrentGame(prev => prev ? {...prev, lastTickTimestamp: Date.now()} : null);
      }

      intervalRef.current = window.setInterval(() => {
        setCurrentGame(prevGame => {
          if (prevGame && prevGame.timerIsRunning && isPhaseWithRunningTimer(prevGame.gamePhase)) {
            return processGameTick(prevGame);
          } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            return prevGame; 
          }
        });
      }, 1000);

    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => { 
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
    { path: "/help", label: "Ayuda", icon: <QuestionIcon /> }, 
    { 
      label: theme === 'light' ? "Modo Oscuro" : "Modo Claro", 
      icon: theme === 'light' ? <MoonIcon /> : <SunIcon />, 
      action: toggleTheme,
      isThemeToggle: true 
    },
    { path: "/", label: "Cerrar Sesión", icon: <SignOutIcon /> },
  ];

  const addPlayerToRoster = (player: Omit<Player, 'id' | 'position'> & { position?: string }) => {
    const newPlayer = { ...player, id: crypto.randomUUID(), position: player.position || "" };
    setPlayersRoster(prev => [...prev, newPlayer]);
  };

  const addPlayersBatchToRoster = (playersData: Array<Omit<Player, 'id' | 'position'> & { position?: string }>) => {
    const newPlayers = playersData.map(playerData => ({
      ...playerData,
      id: crypto.randomUUID(),
      position: playerData.position || ""
    }));
    setPlayersRoster(prevRoster => [...prevRoster, ...newPlayers]);
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

  const addTeam = (name: string, playerIds: string[] = []) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.error("Team name cannot be empty."); 
      return;
    }
    if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
      console.error("Team name already exists."); 
      return;
    }
    const newTeam: Team = { id: crypto.randomUUID(), name: trimmedName, playerIds };
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
        timerIsRunning: false, 
        lastTickTimestamp: null 
    };
    setGameHistory(prev => [finalGame, ...prev]);
    setCurrentGame(null);
  };

  const deleteGameFromHistory = (gameId: string) => {
    setGameHistory(prev => prev.filter(game => game.id !== gameId));
  };

  const deleteMultipleGamesFromHistory = (gameIds: string[]) => {
    setGameHistory(prev => prev.filter(game => !gameIds.includes(game.id)));
  };

  return (
    <HashRouter>
      <ScrollToTop />
      <EnsureInitialRoute />
      <div className="bg-brand-bg-light dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-red-900 min-h-screen flex flex-col overflow-x-hidden select-none">
        <AppLayout
          menuItems={menuItems}
          playersRoster={playersRoster}
          addPlayerToRoster={addPlayerToRoster}
          addPlayersBatchToRoster={addPlayersBatchToRoster}
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
          deleteMultipleGamesFromHistory={deleteMultipleGamesFromHistory}
          currentTheme={theme} // Pass theme to AppLayout
        />
      </div>
    </HashRouter>
  );
};

export default App;
