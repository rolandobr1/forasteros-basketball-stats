
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Game, Player, GamePhase, TeamType, StatType, PlayerStats, TeamGameInfo, initialPlayerStats, GameSettings, GameAction } from '../types';
import TimerDisplay from '../components/TimerDisplay';
import TeamDisplay from '../components/TeamDisplay';
import PlayerStatsModal from '../components/PlayerStatsModal';
import SubstitutionModal from '../components/SubstitutionModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';
import AddPlayerToGameTeamModal from '../components/AddPlayerToGameTeamModal';
import { PlusIcon, StatsChartIcon, SwapIcon, formatTime } from '../utils';

interface GamePageProps {
  gameData: Game | null;
  setGameData: React.Dispatch<React.SetStateAction<Game | null>>;
  onGameEnd: (game: Game) => void;
  roster: Player[];
}

const calculatePlayerPoints = (stats: PlayerStats): number => {
  return (stats[StatType.POINTS_1_MADE] || 0) +
         (stats[StatType.POINTS_2_MADE] || 0) * 2 +
         (stats[StatType.POINTS_3_MADE] || 0) * 3;
};

const getLastName = (fullName: string): string => {
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
};

type ShortcutActionKey = 'plus2' | 'plus3' | 'rebound' | 'assist' | 'steal';
interface LastShortcutAction {
  playerId: string;
  teamType: TeamType;
  actionKey: ShortcutActionKey;
}

const GamePage: React.FC<GamePageProps> = React.memo(({ gameData, setGameData, onGameEnd, roster }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TeamType>('home');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [playerForStats, setPlayerForStats] = useState<Player | null>(null);
  const [teamForStatsModal, setTeamForStatsModal] = useState<TeamType | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [showConfirmEndGame, setShowConfirmEndGame] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [teamToAddTo, setTeamToAddTo] = useState<TeamType | null>(null);
  const [isTeamOrderSwapped, setIsTeamOrderSwapped] = useState(false);

  const [lastShortcutAction, setLastShortcutAction] = useState<LastShortcutAction | null>(null);
  const lastActionClearTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { // Cleanup on unmount
      if (lastActionClearTimeoutRef.current) {
        clearTimeout(lastActionClearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => { if (!gameData) navigate('/setup'); }, [gameData, navigate]);

  const handleStatUpdate = useCallback((player: Player, teamType: TeamType, newStatsForPlayer: PlayerStats) => {
    if (!gameData) return;
    const playerId = player.id;
    const teamToUpdateKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
    const oldTeamData = gameData[teamToUpdateKey];
    const oldPlayerStats = oldTeamData.stats[playerId] || initialPlayerStats;
    const oldTeamScore = oldTeamData.score;
    const newTeamStats = { ...oldTeamData.stats, [playerId]: newStatsForPlayer };
    const newTeamScore = Object.values(newTeamStats).reduce((sum, ps) => sum + calculatePlayerPoints(ps as PlayerStats), 0);
    let newGameLog = [...gameData.gameLog];

    if (newTeamScore !== oldTeamScore) {
        const pointsChange = newTeamScore - oldTeamScore;
        const gameAction: GameAction = {
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'score_update',
            payload: { teamId: teamType, playerId: playerId, pointsScored: pointsChange, quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime },
            description: `${player.name} (${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}) ${pointsChange > 0 ? 'anotó' : 'se le corrigieron'} ${Math.abs(pointsChange)} punto(s).`,
        };
        newGameLog.push(gameAction);
    }
    const oldPersonalFouls = oldPlayerStats[StatType.FOULS_PERSONAL] || 0;
    const newPersonalFouls = newStatsForPlayer[StatType.FOULS_PERSONAL] || 0;
    let newTeamFoulsThisQuarter = oldTeamData.foulsThisQuarter;

    if (newPersonalFouls > oldPersonalFouls) {
        const foulsAdded = newPersonalFouls - oldPersonalFouls; newTeamFoulsThisQuarter += foulsAdded;
        const foulAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'foul_update', payload: { teamId: teamType, playerId: playerId, foulsAdded: foulsAdded, newTotalPersonalFouls: newPersonalFouls, quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime }, description: `${player.name} cometió ${foulsAdded} falta(s).` };
        newGameLog.push(foulAction);
    } else if (newPersonalFouls < oldPersonalFouls) {
        const foulsCorrected = oldPersonalFouls - newPersonalFouls; newTeamFoulsThisQuarter = Math.max(0, newTeamFoulsThisQuarter - foulsCorrected);
         const foulCorrectionAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'foul_update', payload: { teamId: teamType, playerId: playerId, foulsAdded: -foulsCorrected, newTotalPersonalFouls: newPersonalFouls, quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime }, description: `Corrección de falta para ${player.name}.` };
        newGameLog.push(foulCorrectionAction);
    }
    setGameData(prevGame => {
      if (!prevGame) return null;
      const updatedTeam = { ...oldTeamData, stats: newTeamStats, score: newTeamScore, foulsThisQuarter: newTeamFoulsThisQuarter };
      return { ...prevGame, [teamToUpdateKey]: updatedTeam, gameLog: newGameLog };
    });
  }, [gameData, setGameData]);

  const handleShortcutStatClick = useCallback((
    player: Player, 
    teamType: TeamType, 
    statType: StatType.POINTS_2_MADE | StatType.POINTS_3_MADE | StatType.REBOUNDS_DEFENSIVE | StatType.ASSISTS | StatType.STEALS, 
    actionKey: ShortcutActionKey,
    pointsValue?: 2 | 3
  ) => {
    if (!gameData || (gameData.gamePhase !== GamePhase.IN_PROGRESS && gameData.gamePhase !== GamePhase.TIMEOUT)) {
      setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Solo se pueden registrar estadísticas durante el juego activo o tiempos muertos."}); return;
    }
    const teamToCheckKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
    if (gameData.settings.allowFoulOuts && (gameData[teamToCheckKey].stats[player.id]?.[StatType.FOULS_PERSONAL] || 0) >= gameData.settings.maxPersonalFouls) {
      setAlertInfo({isOpen: true, title: "Jugador Expulsado", message: `${player.name} está expulsado y no puede registrar más estadísticas.`}); return;
    }

    setGameData(prevGame => {
        if (!prevGame) return null;
        const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
        const currentTeam = prevGame[teamKey];
        const oldPlayerStats = currentTeam.stats[player.id] || { ...initialPlayerStats };
        let newPlayerStats = { ...oldPlayerStats }; let logDescriptionPart = ""; let scoreIncrement = 0;
        switch (statType) {
            case StatType.POINTS_2_MADE:
                if (pointsValue === 2) { newPlayerStats[StatType.POINTS_2_MADE]++; newPlayerStats[StatType.POINTS_2_ATTEMPTED]++; logDescriptionPart = "+2 Pts"; scoreIncrement = 2; } break;
            case StatType.POINTS_3_MADE:
                if (pointsValue === 3) { newPlayerStats[StatType.POINTS_3_MADE]++; newPlayerStats[StatType.POINTS_3_ATTEMPTED]++; logDescriptionPart = "+3 Pts"; scoreIncrement = 3; } break;
            case StatType.REBOUNDS_DEFENSIVE: newPlayerStats[StatType.REBOUNDS_DEFENSIVE]++; logDescriptionPart = "+1 Reb Def"; break;
            case StatType.ASSISTS: newPlayerStats[StatType.ASSISTS]++; logDescriptionPart = "+1 Ast"; break;
            case StatType.STEALS: newPlayerStats[StatType.STEALS]++; logDescriptionPart = "+1 Robo"; break;
            default: return prevGame;
        }
        const updatedTeamStatsMap = { ...currentTeam.stats, [player.id]: newPlayerStats };
        const newTeamScore = currentTeam.score + scoreIncrement;
        const gameAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: scoreIncrement > 0 ? 'score_update' : 'stat_update', payload: { teamId: teamType, playerId: player.id, statType, pointsScored: scoreIncrement > 0 ? scoreIncrement : undefined, valueIncremented: 1, quarter: prevGame.currentQuarter, isOvertime: prevGame.isOvertime }, description: `${player.name} (${logDescriptionPart}) - ${currentTeam.name}.` };
        return { ...prevGame, [teamKey]: { ...currentTeam, stats: updatedTeamStatsMap, score: newTeamScore }, gameLog: [...prevGame.gameLog, gameAction] };
    });

    // Highlight logic
    if (lastActionClearTimeoutRef.current) {
      clearTimeout(lastActionClearTimeoutRef.current);
    }
    setLastShortcutAction({ playerId: player.id, teamType, actionKey });
    lastActionClearTimeoutRef.current = window.setTimeout(() => {
      setLastShortcutAction(null);
    }, 2500); // Highlight for 2.5 seconds

  }, [gameData, setGameData, lastActionClearTimeoutRef]);

  const handleSubstitution = useCallback((teamType: TeamType, playerIn: Player, playerOut: Player) => {
    if (!gameData) return;
    setGameData(prevGame => {
        if (!prevGame) return null;
        const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
        const currentTeam = prevGame[teamKey];
        const newOnCourt = currentTeam.onCourt.filter(p => p.id !== playerOut.id).concat(playerIn);
        const newBench = currentTeam.bench.filter(p => p.id !== playerIn.id).concat(playerOut);
        const substitutionAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'substitution', payload: { teamId: teamType, playerInId: playerIn.id, playerInName: playerIn.name, playerOutId: playerOut.id, playerOutName: playerOut.name, quarter: prevGame.currentQuarter, isOvertime: prevGame.isOvertime, timeRemaining: prevGame.currentTimeRemainingInPhase }, description: `Sustitución (${teamType === 'home' ? prevGame.homeTeam.name : prevGame.awayTeam.name}): Entra ${playerIn.name}, Sale ${playerOut.name}` };
        return { ...prevGame, [teamKey]: { ...currentTeam, onCourt: newOnCourt, bench: newBench }, gameLog: [...prevGame.gameLog, substitutionAction] };
    });
  }, [gameData, setGameData]);

  const handleAddPlayersFromRosterToGameTeam = useCallback((teamType: TeamType, playersToAdd: Player[]) => {
    if (!gameData) return;
    setGameData(prevGame => {
      if (!prevGame) return null;
      const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
      const currentTeam = prevGame[teamKey];
      const newTeamPlayersList = [...currentTeam.players]; const newBenchList = [...currentTeam.bench]; const newStats = { ...currentTeam.stats }; let newGameLog = [...prevGame.gameLog];
      playersToAdd.forEach(player => {
        if (!newTeamPlayersList.find(p => p.id === player.id)) { 
          newTeamPlayersList.push(player); newBenchList.push(player); newStats[player.id] = { ...initialPlayerStats };
          const addPlayerAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'player_added_to_team', payload: { teamId: teamKey, playerId: player.id, playerName: player.name, quarter: prevGame.currentQuarter, isOvertime: prevGame.isOvertime }, description: `${player.name} añadido a ${currentTeam.name}.` };
          newGameLog.push(addPlayerAction);
        }
      });
      return { ...prevGame, [teamKey]: { ...currentTeam, players: newTeamPlayersList, bench: newBenchList, stats: newStats }, gameLog: newGameLog };
    });
    setIsAddPlayerModalOpen(false); setTeamToAddTo(null);
  }, [gameData, setGameData]);
  
  const openStatsModal = useCallback((player: Player, teamType: TeamType) => {
    if (!gameData || (gameData.gamePhase !== GamePhase.IN_PROGRESS && gameData.gamePhase !== GamePhase.TIMEOUT)) {
        setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Solo se pueden registrar estadísticas durante el juego activo o tiempos muertos."}); return;
    }
    setPlayerForStats(player); setTeamForStatsModal(teamType); setIsStatsModalOpen(true);
  }, [gameData]);
  
  const openSubModal = useCallback((teamType: TeamType) => {
    const allowedPhasesForSub = [ GamePhase.IN_PROGRESS, GamePhase.TIMEOUT, GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK, GamePhase.WARMUP, GamePhase.NOT_STARTED ];
    if (!gameData || !allowedPhasesForSub.includes(gameData.gamePhase)) {
        setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Las sustituciones solo se pueden hacer durante el juego, tiempos muertos, calentamiento o descansos."}); return;
    }
    setTeamForStatsModal(teamType); setIsSubModalOpen(true);
  }, [gameData]);

  const openAddPlayerFromRosterModal = useCallback((teamType: TeamType) => {
    if (gameData?.gamePhase === GamePhase.FINISHED) { setAlertInfo({isOpen: true, title: "Partido Finalizado", message: "No se pueden añadir jugadores a un partido finalizado."}); return; }
    setTeamToAddTo(teamType); setIsAddPlayerModalOpen(true);
  }, [gameData]);

  const handleStartTimer = useCallback(() => {
    setGameData(prev => { 
      if (!prev || prev.gamePhase === GamePhase.FINISHED) return prev;
      let newPhase = prev.gamePhase; let newTime = prev.currentTimeRemainingInPhase;
      let newQuarter = prev.currentQuarter; let newIsOvertime = prev.isOvertime;
      let newLog = [...prev.gameLog];
      const createTimerAction = (description: string): GameAction => ({ id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: newPhase, action: 'started', quarter: newQuarter, isOvertime: newIsOvertime, time: newTime }, description });
      if (newPhase === GamePhase.NOT_STARTED || newPhase === GamePhase.WARMUP) {
        newPhase = GamePhase.IN_PROGRESS; newQuarter = 1; newIsOvertime = false; newTime = prev.settings.quarterDuration;
        newLog.push(createTimerAction(`Partido iniciado. Q${newQuarter} comenzado.`));
      } else if (newPhase === GamePhase.TIMEOUT) {
        newPhase = GamePhase.IN_PROGRESS; newLog.push(createTimerAction(`Juego reanudado desde tiempo muerto. Q${newQuarter}.`));
      } else if (newPhase === GamePhase.QUARTER_BREAK || newPhase === GamePhase.HALFTIME || newPhase === GamePhase.OVERTIME_BREAK) {
        if (newTime <= 0) { // If break time ran out, start next period
            newPhase = GamePhase.IN_PROGRESS; newTime = newIsOvertime ? prev.settings.overtimeDuration : prev.settings.quarterDuration;
            newLog.push(createTimerAction(`Descanso finalizado. ${newIsOvertime ? `OT${newQuarter - prev.settings.quarters}` : `Q${newQuarter}`} comenzado.`));
        } else { newLog.push(createTimerAction(`Temporizador de descanso reanudado.`)); } // Else, just resume break timer
      } else { newLog.push(createTimerAction(`Temporizador iniciado/reanudado. Fase: ${newPhase}.`)); }
      return { ...prev, timerIsRunning: true, lastTickTimestamp: Date.now(), gamePhase: newPhase, currentTimeRemainingInPhase: newTime, currentQuarter: newQuarter, isOvertime: newIsOvertime, startTime: prev.startTime || (newPhase === GamePhase.IN_PROGRESS && newQuarter === 1 && !newIsOvertime ? new Date().toISOString() : prev.startTime), gameLog: newLog };
    });
  }, [setGameData]);

  const handlePauseTimer = useCallback(() => {
    setGameData(prev => { 
      if (!prev || !prev.timerIsRunning) return prev;
      let newPhase = prev.gamePhase; let newLog = [...prev.gameLog];
      const createTimerAction = (description: string): GameAction => ({ id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: newPhase, action: 'paused', quarter: prev.currentQuarter, isOvertime: prev.isOvertime, time: prev.currentTimeRemainingInPhase }, description });
      // If pausing during active play, it's a timeout. Otherwise, just pause the current phase timer.
      if (newPhase === GamePhase.IN_PROGRESS) { newPhase = GamePhase.TIMEOUT; newLog.push(createTimerAction(`Tiempo muerto solicitado. Juego pausado.`)); } 
      else { newLog.push(createTimerAction(`Temporizador pausado. Fase: ${newPhase}.`)); }
      return { ...prev, timerIsRunning: false, gamePhase: newPhase, gameLog: newLog };
    });
  }, [setGameData]);

  const handleResetTimer = useCallback(() => {
    setGameData(prev => { 
        if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning) return prev;
        let timeToResetTo = prev.currentTimeRemainingInPhase;
        switch(prev.gamePhase) {
            case GamePhase.IN_PROGRESS: case GamePhase.TIMEOUT: timeToResetTo = prev.isOvertime ? prev.settings.overtimeDuration : prev.settings.quarterDuration; break;
            case GamePhase.QUARTER_BREAK: case GamePhase.OVERTIME_BREAK: timeToResetTo = prev.settings.breakDuration || 60; break;
            case GamePhase.HALFTIME: timeToResetTo = (prev.settings.breakDuration || 60) * 2; break;
            case GamePhase.WARMUP: timeToResetTo = prev.settings.quarterDuration; break; // Reset warmup to full quarter duration
        }
        const resetAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: prev.gamePhase, action: 'reset', quarter: prev.currentQuarter, isOvertime: prev.isOvertime, oldTime: prev.currentTimeRemainingInPhase, newTime: timeToResetTo }, description: `Temporizador reseteado para ${prev.gamePhase} a ${formatTime(timeToResetTo)}.` };
        return { ...prev, currentTimeRemainingInPhase: timeToResetTo, lastTickTimestamp: null, gameLog: [...prev.gameLog, resetAction] };
    });
  }, [setGameData]);

  const handleGoToNextPeriod = useCallback(() => {
    setGameData(prev => { 
        if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning) return prev;
        let newQuarter = prev.currentQuarter; let newIsOvertime = prev.isOvertime;
        let newTime = 0; let newPhase = GamePhase.IN_PROGRESS; let description = "";
        if (!newIsOvertime) { // In regulation
            if (newQuarter < prev.settings.quarters) { newQuarter++; newTime = prev.settings.quarterDuration; description = `Avanzado a Cuarto ${newQuarter}.`; } 
            else { newIsOvertime = true; newQuarter++; newTime = prev.settings.overtimeDuration; description = `Avanzado a Prórroga ${newQuarter - prev.settings.quarters}.`; }
        } else { // In overtime
            newQuarter++; newTime = prev.settings.overtimeDuration; description = `Avanzado a Prórroga ${newQuarter - prev.settings.quarters}.`; }
        const periodChangeAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: newPhase, action: 'period_advanced', oldQuarter: prev.currentQuarter, newQuarter: newQuarter, isOvertime: newIsOvertime }, description };
        return { ...prev, currentQuarter: newQuarter, isOvertime: newIsOvertime, gamePhase: newPhase, currentTimeRemainingInPhase: newTime, timerIsRunning: false, lastTickTimestamp: null, homeTeam: { ...prev.homeTeam, foulsThisQuarter: 0 }, awayTeam: { ...prev.awayTeam, foulsThisQuarter: 0 }, gameLog: [...prev.gameLog, periodChangeAction] };
    });
  }, [setGameData]);

  const handleGoToPrevPeriod = useCallback(() => {
    setGameData(prev => { 
        if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning || (prev.currentQuarter === 1 && !prev.isOvertime && ![GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK].includes(prev.gamePhase))) return prev;
        let newQuarter = prev.currentQuarter; let newIsOvertime = prev.isOvertime;
        let newTime = 0; let newPhase = GamePhase.IN_PROGRESS; let description = "";
        if (newIsOvertime) { 
            if (newQuarter > prev.settings.quarters + 1) { newQuarter--; newTime = prev.settings.overtimeDuration; description = `Retrocedido a Prórroga ${newQuarter - prev.settings.quarters}.`; } 
            else { newIsOvertime = false; newQuarter = prev.settings.quarters; newTime = prev.settings.quarterDuration; description = `Retrocedido a Cuarto ${newQuarter}.`; }
        } else { newQuarter--; newTime = prev.settings.quarterDuration; description = `Retrocedido a Cuarto ${newQuarter}.`; }
        const periodChangeAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: newPhase, action: 'period_reverted', oldQuarter: prev.currentQuarter, newQuarter: newQuarter, isOvertime: newIsOvertime }, description };
        return { ...prev, currentQuarter: newQuarter, isOvertime: newIsOvertime, gamePhase: newPhase, currentTimeRemainingInPhase: newTime, timerIsRunning: false, lastTickTimestamp: null, homeTeam: { ...prev.homeTeam, foulsThisQuarter: 0 }, awayTeam: { ...prev.awayTeam, foulsThisQuarter: 0 }, gameLog: [...prev.gameLog, periodChangeAction] };
    });
  }, [setGameData]);
  
  const handleEndGameConfirm = useCallback(() => {
    if (gameData) {
      let finalWinningTeam: 'home' | 'away' | 'tie' | null = null;
      if (gameData.homeTeam.score > gameData.awayTeam.score) finalWinningTeam = 'home';
      else if (gameData.awayTeam.score > gameData.homeTeam.score) finalWinningTeam = 'away';
      else finalWinningTeam = 'tie';
      const endGameAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: GamePhase.FINISHED, action: 'game_ended', homeScore: gameData.homeTeam.score, awayScore: gameData.awayTeam.score, winningTeam: finalWinningTeam }, description: `Partido finalizado.` };
      const finalGameData = { ...gameData, gamePhase: GamePhase.FINISHED, endTime: new Date().toISOString(), timerIsRunning: false, lastTickTimestamp: null, winningTeam: finalWinningTeam, gameLog: [...gameData.gameLog, endGameAction] };
      onGameEnd(finalGameData); navigate('/history');
    }
    setShowConfirmEndGame(false);
  }, [gameData, onGameEnd, navigate]);
  
  const getLeadingScorers = useCallback((team: TeamGameInfo): string[] => {
    if (!team || !team.stats || Object.keys(team.stats).length === 0) return [];
    let maxPoints = 0;
    Object.values(team.stats).forEach(playerStat => { const points = calculatePlayerPoints(playerStat); if (points > maxPoints) maxPoints = points; });
    if (maxPoints === 0) return []; 
    return Object.keys(team.stats).filter(playerId => calculatePlayerPoints(team.stats[playerId]) === maxPoints);
  }, []);

  const toggleTeamOrder = useCallback(() => setIsTeamOrderSwapped(prev => !prev), []);
  const handleCloseAlert = useCallback(() => setAlertInfo({ ...alertInfo, isOpen: false }), [alertInfo]);
  const handleConfirmEndGameDialog = useCallback(() => setShowConfirmEndGame(false), []);
  const handleCloseStatsModal = useCallback(() => setIsStatsModalOpen(false), []);
  const handleCloseSubModal = useCallback(() => setIsSubModalOpen(false), []);
  const handleCloseAddPlayerModal = useCallback(() => { setIsAddPlayerModalOpen(false); setTeamToAddTo(null); }, []);


  if (!gameData) return <div className="flex flex-col items-center justify-center h-full"><p className="text-xl text-gray-600 dark:text-slate-300 mb-4">No hay datos del partido.</p><Link to="/setup" className="px-6 py-3 bg-brand-accent text-white rounded-md hover:bg-opacity-90">Configurar Nuevo Partido</Link></div>;

  const currentTeamDisplay = activeTab === 'home' ? gameData.homeTeam : gameData.awayTeam;
  const leadingScorersForCurrentTeam = useMemo(() => getLeadingScorers(currentTeamDisplay), [currentTeamDisplay, getLeadingScorers]);
  
  const teamLeft = useMemo(() => isTeamOrderSwapped ? gameData.awayTeam : gameData.homeTeam, [isTeamOrderSwapped, gameData.homeTeam, gameData.awayTeam]);
  const teamRight = useMemo(() => isTeamOrderSwapped ? gameData.homeTeam : gameData.awayTeam, [isTeamOrderSwapped, gameData.homeTeam, gameData.awayTeam]);
  const teamLeftType: TeamType = useMemo(() => isTeamOrderSwapped ? 'away' : 'home', [isTeamOrderSwapped]);
  const teamRightType: TeamType = useMemo(() => isTeamOrderSwapped ? 'home' : 'away', [isTeamOrderSwapped]);

  const shortcutButtonBaseClass = "p-2.5 text-sm font-medium text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 flex items-center justify-center aspect-square w-10 h-10 transition-all duration-150";
  const playerListItemBaseClass = "flex items-center justify-between p-2 rounded-md";
  const playerListNormalClass = "bg-gray-100 dark:bg-slate-700";
  const playerListHoverClass = "hover:bg-gray-200 dark:hover:bg-slate-600";
  const playerListLeadingScorerClass = "bg-yellow-100 dark:bg-yellow-700/40 border-l-4 border-yellow-500 dark:border-yellow-500";
  const highlightedButtonClass = "ring-4 ring-yellow-400 dark:ring-yellow-500 scale-110";


  return (
    <div className="space-y-4 md:space-y-6">
      <TimerDisplay gameData={gameData} onStartTimer={handleStartTimer} onPauseTimer={handlePauseTimer} onResetTimer={handleResetTimer} onGoToNextPeriod={handleGoToNextPeriod} onGoToPrevPeriod={handleGoToPrevPeriod} />
      
      <div className="relative">
         <div className="grid grid-cols-2 gap-4">
            <TeamDisplay team={teamLeft} gameSettings={gameData.settings} opponentFoulsThisQuarter={teamRight.foulsThisQuarter} />
            <TeamDisplay team={teamRight} gameSettings={gameData.settings} opponentFoulsThisQuarter={teamLeft.foulsThisQuarter}/>
        </div>
        <button onClick={toggleTeamOrder} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-brand-accent" aria-label="Intercambiar posición de equipos"><SwapIcon className="w-5 h-5" /></button>
      </div>

      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-md">
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button onClick={() => setActiveTab(teamLeftType)} className={`flex-1 py-3 px-2 text-center transition-colors duration-150 ${activeTab === teamLeftType ? 'bg-brand-accent text-white font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>{teamLeft.name}</button>
          <button onClick={() => setActiveTab(teamRightType)} className={`flex-1 py-3 px-2 text-center transition-colors duration-150 ${activeTab === teamRightType ? 'bg-brand-accent text-white font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>{teamRight.name}</button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">En Cancha ({currentTeamDisplay.onCourt.length})</h4>
            {currentTeamDisplay.onCourt.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">Nadie en cancha.</p>}
            <ul className="space-y-2">
              {currentTeamDisplay.onCourt.map(player => {
                 const stats = currentTeamDisplay.stats[player.id] || initialPlayerStats;
                 const isEffectivelyFouledOut = gameData.settings.allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= gameData.settings.maxPersonalFouls;
                 const isLeadingScorer = leadingScorersForCurrentTeam.includes(player.id); 
                 const isDisabled = gameData.gamePhase === GamePhase.FINISHED || isEffectivelyFouledOut;
                 const lastName = getLastName(player.name);

                 const checkHighlight = (actionKey: ShortcutActionKey) => 
                    lastShortcutAction &&
                    lastShortcutAction.playerId === player.id &&
                    lastShortcutAction.teamType === activeTab &&
                    lastShortcutAction.actionKey === actionKey;
                
                 // Determine min-width based on whether number is present
                 const playerNameContainerClass = player.number ? "min-w-[8ch] sm:min-w-[12ch]" : "min-w-[12ch] sm:min-w-[16ch]";

                 return (
                    <li key={player.id} className={`${playerListItemBaseClass} ${isLeadingScorer ? playerListLeadingScorerClass : playerListNormalClass} ${!isDisabled ? playerListHoverClass : ''}`}>
                      <div className={`flex-grow truncate ${playerNameContainerClass} ${isEffectivelyFouledOut ? 'text-red-500 line-through' : 'text-gray-800 dark:text-white'}`}>
                        {isLeadingScorer && <span className="text-yellow-600 dark:text-yellow-400 font-bold">★ </span>}
                        {player.number && `#${player.number} `}{lastName}
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-1.5 ml-1 sm:ml-2 flex-shrink-0">
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_2_MADE, 'plus2', 2)} disabled={isDisabled} className={`${shortcutButtonBaseClass} bg-green-600 hover:bg-green-500 focus:ring-green-400 ${checkHighlight('plus2') ? highlightedButtonClass : ''}`} aria-label="+2 Puntos"> +2 </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_3_MADE, 'plus3', 3)} disabled={isDisabled} className={`${shortcutButtonBaseClass} bg-blue-600 hover:bg-blue-500 focus:ring-blue-400 ${checkHighlight('plus3') ? highlightedButtonClass : ''}`} aria-label="+3 Puntos"> +3 </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.REBOUNDS_DEFENSIVE, 'rebound')} disabled={isDisabled} className={`${shortcutButtonBaseClass} bg-orange-500 hover:bg-orange-400 focus:ring-orange-300 ${checkHighlight('rebound') ? highlightedButtonClass : ''}`} aria-label="Rebote Defensivo"> R </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.ASSISTS, 'assist')} disabled={isDisabled} className={`${shortcutButtonBaseClass} bg-purple-600 hover:bg-purple-500 focus:ring-purple-400 ${checkHighlight('assist') ? highlightedButtonClass : ''}`} aria-label="Asistencia"> A </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.STEALS, 'steal')} disabled={isDisabled} className={`${shortcutButtonBaseClass} bg-cyan-600 hover:bg-cyan-500 focus:ring-cyan-400 ${checkHighlight('steal') ? highlightedButtonClass : ''}`} aria-label="Robo"> S </button>
                        <button onClick={() => openStatsModal(player, activeTab)} disabled={isDisabled} className={`${shortcutButtonBaseClass} bg-gray-500 hover:bg-gray-600 dark:bg-brand-button dark:hover:bg-brand-button-hover`} aria-label={`Estadísticas completas para ${player.name}`}>
                          <StatsChartIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </li>);
              })}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Banca ({currentTeamDisplay.bench.length} / Total: {currentTeamDisplay.players.length})</h4>
            {currentTeamDisplay.bench.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">Banca vacía.</p>}
            <ul className="space-y-2">{currentTeamDisplay.bench.map(player => (<li key={player.id} className={`${playerListItemBaseClass} ${playerListNormalClass} ${playerListHoverClass}`}><span className="text-gray-800 dark:text-white truncate">#{player.number} {player.name}</span></li>))}</ul>
          </div>

          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 pt-3 border-t border-gray-200 dark:border-slate-600">
            <button onClick={() => openSubModal(activeTab)} disabled={gameData.gamePhase === GamePhase.FINISHED} className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm disabled:opacity-50">Sustitución</button>
            <button onClick={() => openAddPlayerFromRosterModal(activeTab)} disabled={gameData.gamePhase === GamePhase.FINISHED} className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm disabled:opacity-50 flex items-center justify-center"><PlusIcon className="w-4 h-4 mr-1" /> Añadir Jugador (Plantilla)</button>
          </div>
        </div>
      </div>
      
      {gameData.gamePhase !== GamePhase.FINISHED && <button onClick={() => setShowConfirmEndGame(true)} className="w-full mt-6 py-3 px-6 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transition-colors">Finalizar Partido</button>}
      {gameData.gamePhase === GamePhase.FINISHED && <Link to="/history" className="block w-full mt-6 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white text-center font-bold rounded-lg shadow-lg transition-colors">Ver Historial de Partidos</Link>}

      {isStatsModalOpen && playerForStats && teamForStatsModal && gameData && ( <PlayerStatsModal isOpen={isStatsModalOpen} onClose={handleCloseStatsModal} player={playerForStats} teamType={teamForStatsModal} currentStats={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam'].stats[playerForStats.id] || initialPlayerStats} onSaveStats={handleStatUpdate} maxPersonalFouls={gameData.settings.maxPersonalFouls} allowFoulOuts={gameData.settings.allowFoulOuts} /> )}
      {isSubModalOpen && teamForStatsModal && gameData && (<SubstitutionModal isOpen={isSubModalOpen} onClose={handleCloseSubModal} team={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam']} teamType={teamForStatsModal} onConfirmSubstitution={handleSubstitution} />)}
      <ConfirmDialog isOpen={showConfirmEndGame} onClose={handleConfirmEndGameDialog} onConfirm={handleEndGameConfirm} title="Confirmar Finalización" confirmText="Sí, finalizar">¿Estás seguro de que quieres finalizar este partido? No podrás realizar más cambios.</ConfirmDialog>
      <AlertDialog isOpen={alertInfo.isOpen} onClose={handleCloseAlert} title={alertInfo.title}>{alertInfo.message}</AlertDialog>
      {teamToAddTo && gameData && (<AddPlayerToGameTeamModal isOpen={isAddPlayerModalOpen} onClose={handleCloseAddPlayerModal} teamType={teamToAddTo} currentTeamName={teamToAddTo === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name} playersAlreadyInGameTeam={teamToAddTo === 'home' ? gameData.homeTeam.players : gameData.awayTeam.players} globalRoster={roster} onAddPlayers={handleAddPlayersFromRosterToGameTeam} unavailablePlayerIds={teamToAddTo === 'home' ? gameData.awayTeam.players.map(p=>p.id) : gameData.homeTeam.players.map(p=>p.id)} />)}
    </div>
  );
});

export default GamePage;
