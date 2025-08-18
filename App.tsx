
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
  advanceGameTime,
  formatTime,
  SunIcon, 
  MoonIcon,
  ExportIcon,
} from './utils';
import AlertDialog from './components/AlertDialog';

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
  menuItems: { path: string; label: string; icon: React.ReactNode; action?: () => void; hide?: boolean; }[];
  playersRoster: Player[];
  addPlayerToRoster: (player: Omit<Player, 'id' | 'position'> & { position?: string }) => void;
  addPlayersBatchToRoster: (playersData: Array<Omit<Player, 'id' | 'position'> & { position?: string }>) => void;
  updatePlayerInRoster: (updatedPlayer: Player) => void;
  deletePlayerFromRoster: (playerId: string) => void;
  reorderPlayersInRoster: (newRoster: Player[]) => void;
  upsertPlayersToRoster: (playersToUpsert: Player[]) => void; // New
  teams: Team[];
  addTeam: (name: string, playerIds?: string[]) => void;
  updateTeamName: (teamId: string, newName: string) => void;
  deleteTeam: (teamId: string) => void;
  assignPlayersToTeam: (teamId: string, newPlayerIds: string[]) => void;
  upsertTeam: (teamToUpsert: { id: string; name: string; playerIds: string[] }) => void; // New
  currentGame: Game | null;
  setCurrentGame: React.Dispatch<React.SetStateAction<Game | null>>;
  saveCompletedGame: (game: Game) => void;
  gameHistory: Game[];
  deleteGameFromHistory: (gameId: string) => void;
  currentTheme: 'light' | 'dark';
  importGamesAndPlayers: (gamesToImportData: string) => void;
}

const AppLayout: React.FC<AppLayoutProps> = React.memo(({
  menuItems,
  playersRoster,
  addPlayerToRoster,
  addPlayersBatchToRoster,
  updatePlayerInRoster,
  deletePlayerFromRoster,
  reorderPlayersInRoster,
  upsertPlayersToRoster, // New
  teams,
  addTeam,
  updateTeamName,
  deleteTeam,
  assignPlayersToTeam,
  upsertTeam, // New
  currentGame,
  setCurrentGame,
  saveCompletedGame,
  gameHistory,
  deleteGameFromHistory,
  importGamesAndPlayers,
  // currentTheme // Not directly used in AppLayout rendering, theme is applied to <html>
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

  const shouldDisplayLiveTime = useCallback((game: Game | null): boolean => {
    if (!game) return false;
    // Display time if it's IN_PROGRESS, WARMUP, or even TIMEOUT (shows paused time)
    // Breaks are no longer auto-timed, so they won't show active countdowns here naturally.
    return [
      GamePhase.IN_PROGRESS,
      GamePhase.WARMUP,
      GamePhase.TIMEOUT, // Show time even if paused in timeout
      GamePhase.QUARTER_BREAK, // Show time if manually in this phase (e.g. for reset display)
      GamePhase.HALFTIME,
      GamePhase.OVERTIME_BREAK,
    ].includes(game.gamePhase);
  }, []);

  const handleNavigateHome = useCallback(() => navigate('/home'), [navigate]);
  const handleNavigateGame = useCallback(() => navigate('/game'), [navigate]);
  const handleToggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);
  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), []);

  const visibleMenuItems = menuItems.filter(item => !item.hide);

  return (
    <>
      {(showBackButton || showHomeButton || showGameInProgressButton) && (
        <div className="fixed top-4 left-4 z-40 flex items-center space-x-2">
          {showBackButton && <GoBackButton />}
          {showHomeButton && (
             <button
              onClick={handleNavigateHome}
              className="flex items-center text-gray-700 dark:text-white p-2 rounded-full bg-white dark:bg-brand-surface shadow-md hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Ir a Inicio"
            >
              <StartIcon className="w-5 h-5" />
            </button>
          )}
          {showGameInProgressButton && currentGame && (
            <>
              <button
                onClick={handleNavigateGame}
                className="flex items-center text-white p-2 rounded-md bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-md text-sm"
                aria-label="Ir al partido en curso"
              >
                <LiveGameIcon className="w-5 h-5 mr-1.5" />
                Partido en Curso
              </button>
              {shouldDisplayLiveTime(currentGame) && (
                <span 
                  className="text-gray-700 dark:text-white text-sm font-mono bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded-md shadow-md"
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
              onClick={handleToggleMenu}
              className="text-gray-700 dark:text-white p-2 rounded-full bg-white dark:bg-brand-surface shadow-md hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Abrir menú de navegación"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              id="menu-button"
            >
              <EllipsisVerticalIcon className="w-6 h-6" />
            </button>
            <DropdownMenu
              isOpen={isMenuOpen}
              onClose={handleCloseMenu}
              menuItems={visibleMenuItems}
              triggerRef={menuButtonRef}
            />
          </div>
        </div>
      )}
      <main className="flex-grow py-6 pt-20"> {/* Removed container mx-auto px-4 */}
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/home" 
            element={<HomePage currentGame={currentGame} onImportGames={importGamesAndPlayers} />} 
          />
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
                onAddPlayersBatch={addPlayersBatchToRoster}
                onUpdatePlayer={updatePlayerInRoster}
                onDeletePlayer={deletePlayerFromRoster}
                onReorderPlayers={reorderPlayersInRoster}
                upsertPlayersToRoster={upsertPlayersToRoster} // New
                teams={teams}
                onAddTeam={addTeam}
                onUpdateTeamName={updateTeamName}
                onDeleteTeam={deleteTeam}
                onAssignPlayersToTeam={assignPlayersToTeam}
                upsertTeam={upsertTeam} // New
              />
            }
          />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </main>
    </>
  );
});

const MainApp: React.FC = () => {
  const [playersRoster, setPlayersRoster] = useLocalStorage<Player[]>(LOCAL_STORAGE_KEYS.PLAYERS_ROSTER, []);
  const [gameHistory, setGameHistory] = useLocalStorage<Game[]>(LOCAL_STORAGE_KEYS.GAME_HISTORY, []);
  const [currentGame, setCurrentGame] = useLocalStorage<Game | null>(LOCAL_STORAGE_KEYS.CURRENT_GAME, null);
  const [teams, setTeams] = useLocalStorage<Team[]>(LOCAL_STORAGE_KEYS.TEAMS, []);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app-theme', 'light');
  const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  const intervalRef = useRef<number | null>(null);
  const navigate = useNavigate(); // For programmatic navigation

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, [setTheme]);
  
  // Determines if the game's current phase is one where the timer actively counts down.
  // This is used by the main timer interval.
  const isPhaseWithRunningTimer = useCallback((phase: GamePhase | undefined): boolean => {
    if (!phase) return false;
    return [
      GamePhase.IN_PROGRESS,
      GamePhase.WARMUP,
      // QUARTER_BREAK, HALFTIME, OVERTIME_BREAK are removed as per user request
      // to eliminate automatic breaks. Timer pauses, user manually starts next period.
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

  const handleExportCurrentGame = useCallback(() => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
      try {
        const jsonString = JSON.stringify(currentGame, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const gameNamePart = currentGame.settings.gameName 
          ? currentGame.settings.gameName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
          : `${currentGame.homeTeam.name}_vs_${currentGame.awayTeam.name}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
        link.download = `forasteros_partido_en_curso_${gameNamePart}_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setAlertState({ isOpen: true, title: "Exportación Exitosa", message: "El partido en curso ha sido exportado como JSON." });
      } catch (error) {
        console.error("Error exporting current game:", error);
        setAlertState({ isOpen: true, title: "Error de Exportación", message: "No se pudo exportar el partido en curso." });
      }
    } else {
        setAlertState({ isOpen: true, title: "Error de Exportación", message: "No hay partido en curso para exportar o ya ha finalizado." });
    }
  }, [currentGame]);

  const menuItems = React.useMemo(() => [
    { path: "/home", label: "Inicio", icon: <StartIcon /> },
    { path: "/game", label: "Partido", icon: <BasketballIcon /> },
    { 
      path: "#export-current-game", 
      label: "Exportar Partido en Curso (JSON)", 
      icon: <ExportIcon />,
      action: handleExportCurrentGame,
      hide: !(currentGame && currentGame.gamePhase !== GamePhase.FINISHED)
    },
    { path: "/roster", label: "Jugadores", icon: <UsersIcon /> },
    { path: "/history", label: "Historial", icon: <ClockIcon /> },
    { path: "/help", label: "Ayuda", icon: <QuestionIcon /> },
    { 
      path: "#theme-toggle", 
      label: theme === 'light' ? "Cambiar a Tema Oscuro" : "Cambiar a Tema Claro", 
      icon: theme === 'light' 
        ? <MoonIcon className="text-gray-700 dark:text-brand-text-secondary" /> 
        : <SunIcon className="text-gray-700 dark:text-brand-text-secondary" />,
      action: toggleTheme 
    },
    { path: "/", label: "Cerrar Sesión", icon: <SignOutIcon /> },
  ], [theme, toggleTheme, currentGame, handleExportCurrentGame]);

  const addPlayerToRoster = useCallback((player: Omit<Player, 'id' | 'position'> & { position?: string }) => {
    const newPlayer = { ...player, id: crypto.randomUUID(), position: player.position || "" };
    setPlayersRoster(prev => [...prev, newPlayer]);
  }, [setPlayersRoster]);

  const addPlayersBatchToRoster = useCallback((playersData: Array<Omit<Player, 'id' | 'position'> & { position?: string }>) => {
    const newPlayers = playersData.map(playerData => ({
      ...playerData,
      id: crypto.randomUUID(),
      position: playerData.position || ""
    }));
    setPlayersRoster(prevRoster => [...prevRoster, ...newPlayers]);
  }, [setPlayersRoster]);

  const updatePlayerInRoster = useCallback((updatedPlayer: Player) => {
    setPlayersRoster(prev => prev.map(p => p.id === updatedPlayer.id ? { ...p, ...updatedPlayer, position: updatedPlayer.position || "" } : p));
  }, [setPlayersRoster]);

  const deletePlayerFromRoster = useCallback((playerId: string) => {
    setPlayersRoster(prev => prev.filter(p => p.id !== playerId));
    setTeams(prevTeams =>
      prevTeams.map(team => ({
        ...team,
        playerIds: team.playerIds.filter(id => id !== playerId)
      }))
    );
  }, [setPlayersRoster, setTeams]);

  const reorderPlayersInRoster = useCallback((newRoster: Player[]) => {
    setPlayersRoster(newRoster);
  }, [setPlayersRoster]);

  const upsertPlayersToRoster = useCallback((playersToUpsert: Player[]) => {
    setPlayersRoster(prevRoster => {
      const rosterCopy = [...prevRoster];
      let playersAdded = 0;
      let playersUpdated = 0;
      playersToUpsert.forEach(playerToUpsert => {
        const existingPlayerIndex = rosterCopy.findIndex(p => p.id === playerToUpsert.id);
        if (existingPlayerIndex !== -1) {
          rosterCopy[existingPlayerIndex] = { ...rosterCopy[existingPlayerIndex], ...playerToUpsert };
          playersUpdated++;
        } else {
          rosterCopy.push({ ...playerToUpsert }); // Ensure all fields are present
          playersAdded++;
        }
      });
      // Optionally show alert here or rely on RosterManagementPage
      // setAlertState({ isOpen: true, title: "Plantilla Actualizada", message: `${playersAdded} jugador(es) añadido(s), ${playersUpdated} actualizado(s).` });
      return rosterCopy;
    });
  }, [setPlayersRoster]);

  const addTeam = useCallback((name: string, playerIds: string[] = []) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAlertState({isOpen: true, title: "Error al Crear Equipo", message: "El nombre del equipo no puede estar vacío."});
      return;
    }
    if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
       setAlertState({isOpen: true, title: "Error al Crear Equipo", message: "Ya existe un equipo con este nombre."});
      return;
    }
    const newTeam: Team = { id: crypto.randomUUID(), name: trimmedName, playerIds };
    setTeams(prev => [...prev, newTeam]);
  }, [teams, setTeams]);

  const updateTeamName = useCallback((teamId: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      setAlertState({isOpen: true, title: "Error al Actualizar", message: "El nombre del equipo no puede estar vacío."}); return;
    }
    if (teams.some(team => team.id !== teamId && team.name.toLowerCase() === trimmedNewName.toLowerCase())) {
      setAlertState({isOpen: true, title: "Error al Actualizar", message: "Ya existe otro equipo con este nombre."}); return;
    }
    setTeams(prev => prev.map(team => team.id === teamId ? { ...team, name: trimmedNewName } : team));
  }, [teams, setTeams]);

  const deleteTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  }, [setTeams]);

  const assignPlayersToTeam = useCallback((teamId: string, newPlayerIds: string[]) => {
    setTeams(prev => prev.map(team => team.id === teamId ? { ...team, playerIds: newPlayerIds } : team));
  }, [setTeams]);
  
  const upsertTeam = useCallback((teamToUpsert: { id: string; name: string; playerIds: string[] }) => {
    setTeams(prevTeams => {
      const teamIndex = prevTeams.findIndex(t => t.id === teamToUpsert.id);
      if (teamIndex !== -1) {
        // Update existing team
        const updatedTeams = [...prevTeams];
        updatedTeams[teamIndex] = { ...updatedTeams[teamIndex], name: teamToUpsert.name, playerIds: teamToUpsert.playerIds };
        // setAlertState({ isOpen: true, title: "Equipo Actualizado", message: `Equipo "${teamToUpsert.name}" actualizado.` });
        return updatedTeams;
      } else {
        // Add new team
        // setAlertState({ isOpen: true, title: "Equipo Añadido", message: `Equipo "${teamToUpsert.name}" importado y añadido.` });
        return [...prevTeams, { id: teamToUpsert.id, name: teamToUpsert.name, playerIds: teamToUpsert.playerIds }];
      }
    });
  }, [setTeams]);

  const saveCompletedGame = useCallback((game: Game) => {
    const finalGame = { 
        ...game, 
        gamePhase: GamePhase.FINISHED, 
        endTime: new Date().toISOString(),
        timerIsRunning: false, 
        lastTickTimestamp: null 
    };
    setGameHistory(prev => [finalGame, ...prev].sort((a,b) => (b.startTime ? new Date(b.startTime).getTime() : 0) - (a.startTime ? new Date(a.startTime).getTime() : 0)));
    setCurrentGame(null); 
    navigate('/history');
  }, [setGameHistory, setCurrentGame, navigate]);

  const deleteGameFromHistory = useCallback((gameId: string) => {
    setGameHistory(prev => prev.filter(game => game.id !== gameId));
  }, [setGameHistory]);

 const importGamesAndPlayers = useCallback((gamesToImportData: string) => {
    let importResult: { success: boolean; message: string, shouldNavigateToGame: boolean };
    try {
      const parsedData = JSON.parse(gamesToImportData);
      let gamesToProcess: Game[];
      let isSingleGameImport = false;

      if (Array.isArray(parsedData)) {
        gamesToProcess = parsedData as Game[];
      } else if (typeof parsedData === 'object' && parsedData !== null && parsedData.id && parsedData.homeTeam && parsedData.awayTeam) {
        // Basic check for a single game object structure
        gamesToProcess = [parsedData as Game];
        isSingleGameImport = true;
      } else {
        importResult = { success: false, message: "Error al importar: el archivo JSON no contiene un partido válido o un array de partidos.", shouldNavigateToGame: false };
        setAlertState({ isOpen: true, title: "Error de Importación", message: importResult.message });
        return;
      }
      
      let gamesAddedCount = 0;
      let playersAddedCount = 0;
      
      const newPlayersRoster = [...playersRoster];
      const existingPlayerIds = new Set(newPlayersRoster.map(p => p.id));

      const newGameHistory = [...gameHistory];
      const existingGameIds = new Set(newGameHistory.map(g => g.id));

      let gameToResume: Game | null = null;

      for (const gameToImport of gamesToProcess) {
        if (!gameToImport || !gameToImport.id || !gameToImport.homeTeam || !gameToImport.awayTeam || !gameToImport.homeTeam.players || !gameToImport.awayTeam.players) {
          console.warn("Skipping invalid game object during import:", gameToImport);
          continue;
        }

        const gamePlayers = [...gameToImport.homeTeam.players, ...gameToImport.awayTeam.players];
        for (const player of gamePlayers) {
          if (player && player.id && !existingPlayerIds.has(player.id)) {
            const newPlayerToAdd: Player = {
              id: player.id,
              name: player.name || `Jugador Importado ${player.id.substring(0,4)}`,
              number: player.number || '00',
              position: player.position || ''
            };
            newPlayersRoster.push(newPlayerToAdd);
            existingPlayerIds.add(player.id);
            playersAddedCount++;
          }
        }
        
        if (isSingleGameImport && gamesToProcess.length === 1) {
            gameToResume = gameToImport; // The full game object is used
            gamesAddedCount = 1; 
        } else { // Multi-game import (array)
            let uniqueGameId = gameToImport.id;
            if (existingGameIds.has(uniqueGameId)) {
                uniqueGameId = crypto.randomUUID(); // Ensure ID is unique in history
            }
            const finalGameToImport = { ...gameToImport, id: uniqueGameId };
            newGameHistory.push(finalGameToImport);
            existingGameIds.add(uniqueGameId);
            gamesAddedCount++;
        }
      }

      setPlayersRoster(newPlayersRoster); // Update global roster

      if (isSingleGameImport && gameToResume) {
        setCurrentGame(gameToResume); // Set as current game
        importResult = { success: true, message: `Partido importado y listo para reanudar. ${playersAddedCount} jugador(es) nuevo(s) añadido(s) a la plantilla.`, shouldNavigateToGame: true };
      } else {
        setGameHistory(newGameHistory.sort((a,b) => (b.startTime ? new Date(b.startTime).getTime() : 0) - (a.startTime ? new Date(a.startTime).getTime() : 0)));
        importResult = { success: true, message: `${gamesAddedCount} partido(s) importado(s) al historial. ${playersAddedCount} jugador(es) nuevo(s) añadido(s) a la plantilla.`, shouldNavigateToGame: false };
      }
    } catch (error) {
      console.error("Error importing games:", error);
      importResult = { success: false, message: "Error al importar: el archivo JSON es inválido o está corrupto.", shouldNavigateToGame: false };
    }

    setAlertState({ isOpen: true, title: importResult.success ? "Importación Exitosa" : "Error de Importación", message: importResult.message });
    
    if (importResult.success && importResult.shouldNavigateToGame) {
        navigate('/game'); // Navigate after state updates
    }
  }, [playersRoster, gameHistory, setPlayersRoster, setGameHistory, setCurrentGame, setAlertState, navigate]);


  return (
    <>
      <ScrollToTop />
      <EnsureInitialRoute />
      <div className="bg-gray-100 dark:bg-gradient-to-br dark:from-brand-dark dark:via-black dark:to-red-900 min-h-screen flex flex-col overflow-x-hidden select-none">
        <AppLayout
          menuItems={menuItems}
          playersRoster={playersRoster}
          addPlayerToRoster={addPlayerToRoster}
          addPlayersBatchToRoster={addPlayersBatchToRoster}
          updatePlayerInRoster={updatePlayerInRoster}
          deletePlayerFromRoster={deletePlayerFromRoster}
          reorderPlayersInRoster={reorderPlayersInRoster}
          upsertPlayersToRoster={upsertPlayersToRoster} // New
          teams={teams}
          addTeam={addTeam}
          updateTeamName={updateTeamName}
          deleteTeam={deleteTeam}
          assignPlayersToTeam={assignPlayersToTeam}
          upsertTeam={upsertTeam} // New
          currentGame={currentGame}
          setCurrentGame={setCurrentGame}
          saveCompletedGame={saveCompletedGame}
          gameHistory={gameHistory}
          deleteGameFromHistory={deleteGameFromHistory}
          currentTheme={theme}
          importGamesAndPlayers={importGamesAndPlayers}
        />
      </div>
      <AlertDialog 
        isOpen={alertState.isOpen} 
        onClose={() => setAlertState(prev => ({...prev, isOpen: false}))} 
        title={alertState.title}
      >
        {alertState.message}
      </AlertDialog>
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <MainApp />
    </HashRouter>
  );
};

export default App;
