

import React, { useState, useEffect, useCallback, useRef } from 'react';
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


const GamePage: React.FC<GamePageProps> = ({ gameData, setGameData, onGameEnd, roster }) => {
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
  
  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const bgSlate700 = "bg-slate-200 dark:bg-slate-700";
  const hoverBgSlate600 = "hover:bg-slate-300 dark:hover:bg-slate-600";
  const borderSlate700 = "border-brand-border-light dark:border-slate-700";
  const buttonPrimary = "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white";
  const buttonAccent = "bg-brand-accent-light dark:bg-brand-accent text-white";


  useEffect(() => {
    if (!gameData) {
      navigate('/setup');
    }
  }, [gameData, navigate]);

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
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'score_update',
            payload: {
                teamId: teamType,
                playerId: playerId,
                pointsScored: pointsChange,
                quarter: gameData.currentQuarter,
                isOvertime: gameData.isOvertime,
            },
            description: `${player.name} (${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}) ${pointsChange > 0 ? 'anotó' : 'se le corrigieron'} ${Math.abs(pointsChange)} punto(s). Nuevo marcador de equipo: ${newTeamScore}.`,
        };
        newGameLog.push(gameAction);
    }
    
    const oldPersonalFouls = oldPlayerStats[StatType.FOULS_PERSONAL] || 0;
    const newPersonalFouls = newStatsForPlayer[StatType.FOULS_PERSONAL] || 0;
    let newTeamFoulsThisQuarter = oldTeamData.foulsThisQuarter;

    if (newPersonalFouls > oldPersonalFouls) {
        const foulsAdded = newPersonalFouls - oldPersonalFouls;
        newTeamFoulsThisQuarter += foulsAdded;
        const foulAction: GameAction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'foul_update',
            payload: { teamId: teamType, playerId: playerId, foulsAdded: foulsAdded, newTotalPersonalFouls: newPersonalFouls, quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime },
            description: `${player.name} (${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}) cometió ${foulsAdded} falta(s). Total personal: ${newPersonalFouls}.`,
        };
        newGameLog.push(foulAction);
    } else if (newPersonalFouls < oldPersonalFouls) {
        const foulsCorrected = oldPersonalFouls - newPersonalFouls;
        newTeamFoulsThisQuarter = Math.max(0, newTeamFoulsThisQuarter - foulsCorrected);
         const foulCorrectionAction: GameAction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'foul_update',
            payload: { teamId: teamType, playerId: playerId, foulsAdded: -foulsCorrected, newTotalPersonalFouls: newPersonalFouls, quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime },
            description: `Corrección de falta para ${player.name} (${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}). Total personal: ${newPersonalFouls}.`,
        };
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
    statType: StatType.POINTS_2_MADE | StatType.POINTS_3_MADE | StatType.REBOUNDS_DEFENSIVE | StatType.ASSISTS, 
    pointsValue?: 2 | 3
  ) => {
    if (!gameData || (gameData.gamePhase !== GamePhase.IN_PROGRESS && gameData.gamePhase !== GamePhase.TIMEOUT)) {
      setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Solo se pueden registrar estadísticas durante el juego activo o tiempos muertos."});
      return;
    }
    const teamToCheckKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
    if (gameData.settings.allowFoulOuts && (gameData[teamToCheckKey].stats[player.id]?.[StatType.FOULS_PERSONAL] || 0) >= gameData.settings.maxPersonalFouls) {
      setAlertInfo({isOpen: true, title: "Jugador Expulsado", message: `${player.name} está expulsado y no puede registrar más estadísticas.`});
      return;
    }

    setGameData(prevGame => {
        if (!prevGame) return null;

        const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
        const currentTeam = prevGame[teamKey];
        const oldPlayerStats = currentTeam.stats[player.id] || { ...initialPlayerStats };
        let newPlayerStats = { ...oldPlayerStats };
        let logDescriptionPart = "";
        let scoreIncrement = 0;

        switch (statType) {
            case StatType.POINTS_2_MADE:
                if (pointsValue === 2) {
                    newPlayerStats[StatType.POINTS_2_MADE] = (newPlayerStats[StatType.POINTS_2_MADE] || 0) + 1;
                    newPlayerStats[StatType.POINTS_2_ATTEMPTED] = (newPlayerStats[StatType.POINTS_2_ATTEMPTED] || 0) + 1;
                    logDescriptionPart = "+2 Puntos";
                    scoreIncrement = 2;
                }
                break;
            case StatType.POINTS_3_MADE:
                if (pointsValue === 3) {
                    newPlayerStats[StatType.POINTS_3_MADE] = (newPlayerStats[StatType.POINTS_3_MADE] || 0) + 1;
                    newPlayerStats[StatType.POINTS_3_ATTEMPTED] = (newPlayerStats[StatType.POINTS_3_ATTEMPTED] || 0) + 1;
                    logDescriptionPart = "+3 Puntos";
                    scoreIncrement = 3;
                }
                break;
            case StatType.REBOUNDS_DEFENSIVE:
                newPlayerStats[StatType.REBOUNDS_DEFENSIVE] = (newPlayerStats[StatType.REBOUNDS_DEFENSIVE] || 0) + 1;
                logDescriptionPart = "+1 Rebote Def.";
                break;
            case StatType.ASSISTS:
                newPlayerStats[StatType.ASSISTS] = (newPlayerStats[StatType.ASSISTS] || 0) + 1;
                logDescriptionPart = "+1 Asistencia";
                break;
            default:
                console.warn("Unhandled shortcut stat type:", statType);
                return prevGame;
        }

        const updatedTeamStatsMap = { ...currentTeam.stats, [player.id]: newPlayerStats };
        const newTeamScore = currentTeam.score + scoreIncrement;

        const gameAction: GameAction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: scoreIncrement > 0 ? 'score_update' : 'stat_update',
            payload: {
                teamId: teamType, playerId: player.id, statType,
                pointsScored: scoreIncrement > 0 ? scoreIncrement : undefined,
                valueIncremented: 1, quarter: prevGame.currentQuarter, isOvertime: prevGame.isOvertime,
            },
            description: `${player.name} (${logDescriptionPart}) - Equipo: ${currentTeam.name}.`,
        };

        return {
            ...prevGame,
            [teamKey]: { ...currentTeam, stats: updatedTeamStatsMap, score: newTeamScore },
            gameLog: [...prevGame.gameLog, gameAction],
        };
    });
  }, [gameData, setGameData]);

  const handleSubstitution = useCallback((teamType: TeamType, playerIn: Player, playerOut: Player) => {
    if (!gameData) return;
    
    setGameData(prevGame => {
        if (!prevGame) return null;
        const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
        const currentTeam = prevGame[teamKey];
        const newOnCourt = currentTeam.onCourt.filter(p => p.id !== playerOut.id).concat(playerIn);
        const newBench = currentTeam.bench.filter(p => p.id !== playerIn.id).concat(playerOut);
        
        const substitutionAction: GameAction = {
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'substitution',
            payload: { teamId: teamType, playerInId: playerIn.id, playerInName: playerIn.name, playerOutId: playerOut.id, playerOutName: playerOut.name, quarter: prevGame.currentQuarter, isOvertime: prevGame.isOvertime, timeRemaining: prevGame.currentTimeRemainingInPhase },
            description: `Sustitución (${teamType === 'home' ? prevGame.homeTeam.name : prevGame.awayTeam.name}): Entra ${playerIn.name} (#${playerIn.number}), Sale ${playerOut.name} (#${playerOut.number})`,
        };
        return { ...prevGame, [teamKey]: { ...currentTeam, onCourt: newOnCourt, bench: newBench }, gameLog: [...prevGame.gameLog, substitutionAction] };
    });
  }, [gameData, setGameData]);

  const handleAddPlayersFromRosterToGameTeam = useCallback((teamType: TeamType, playersToAdd: Player[]) => {
    if (!gameData) return;
    setGameData(prevGame => {
      if (!prevGame) return null;
      const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
      const currentTeam = prevGame[teamKey];
      const newTeamPlayersList = [...currentTeam.players];
      const newBenchList = [...currentTeam.bench];
      const newStats = { ...currentTeam.stats };
      let newGameLog = [...prevGame.gameLog];

      playersToAdd.forEach(player => {
        if (!newTeamPlayersList.find(p => p.id === player.id)) { 
          newTeamPlayersList.push(player); newBenchList.push(player); newStats[player.id] = { ...initialPlayerStats };
          const addPlayerAction: GameAction = {
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'player_added_to_team',
            payload: { teamId: teamKey, playerId: player.id, playerName: player.name, quarter: prevGame.currentQuarter, isOvertime: prevGame.isOvertime },
            description: `${player.name} añadido a ${currentTeam.name} durante el partido.`,
          };
          newGameLog.push(addPlayerAction);
        }
      });
      return { ...prevGame, [teamKey]: { ...currentTeam, players: newTeamPlayersList, bench: newBenchList, stats: newStats }, gameLog: newGameLog };
    });
    setIsAddPlayerModalOpen(false); setTeamToAddTo(null);
  }, [gameData, setGameData]);
  
  const openStatsModal = (player: Player, teamType: TeamType) => {
    if (!gameData || (gameData.gamePhase !== GamePhase.IN_PROGRESS && gameData.gamePhase !== GamePhase.TIMEOUT)) {
        setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Solo se pueden registrar estadísticas durante el juego activo o tiempos muertos."});
        return;
    }
    setPlayerForStats(player); 
    setTeamForStatsModal(teamType);
    setIsStatsModalOpen(true);
  };
  
  const openSubModal = (teamType: TeamType) => {
    const allowedPhasesForSub = [ GamePhase.IN_PROGRESS, GamePhase.TIMEOUT, GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK, GamePhase.WARMUP, GamePhase.NOT_STARTED ];
    if (!gameData || !allowedPhasesForSub.includes(gameData.gamePhase)) {
        setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Las sustituciones solo se pueden hacer durante el juego, tiempos muertos, calentamiento o descansos."});
        return;
    }
    setTeamForStatsModal(teamType); setIsSubModalOpen(true);
  };

  const openAddPlayerFromRosterModal = (teamType: TeamType) => {
    if (gameData?.gamePhase === GamePhase.FINISHED) {
      setAlertInfo({isOpen: true, title: "Partido Finalizado", message: "No se pueden añadir jugadores a un partido finalizado."});
      return;
    }
    setTeamToAddTo(teamType); setIsAddPlayerModalOpen(true);
  };

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
        if (newTime <= 0) { 
            newPhase = GamePhase.IN_PROGRESS; newTime = newIsOvertime ? prev.settings.overtimeDuration : prev.settings.quarterDuration;
            newLog.push(createTimerAction(`Descanso finalizado. ${newIsOvertime ? `OT${newQuarter - prev.settings.quarters}` : `Q${newQuarter}`} comenzado.`));
        } else { newLog.push(createTimerAction(`Temporizador de descanso reanudado.`)); }
      } else { newLog.push(createTimerAction(`Temporizador iniciado/reanudado. Fase: ${newPhase}.`)); }
      
      return { ...prev, timerIsRunning: true, lastTickTimestamp: Date.now(), gamePhase: newPhase, currentTimeRemainingInPhase: newTime, currentQuarter: newQuarter, isOvertime: newIsOvertime, startTime: prev.startTime || (newPhase === GamePhase.IN_PROGRESS && newQuarter === 1 && !newIsOvertime ? new Date().toISOString() : prev.startTime), gameLog: newLog };
    });
  }, [setGameData]);

  const handlePauseTimer = useCallback(() => {
    setGameData(prev => {
      if (!prev || !prev.timerIsRunning) return prev;
      let newPhase = prev.gamePhase; let newLog = [...prev.gameLog];
      const createTimerAction = (description: string): GameAction => ({ id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: newPhase, action: 'paused', quarter: prev.currentQuarter, isOvertime: prev.isOvertime, time: prev.currentTimeRemainingInPhase }, description });
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
        case GamePhase.WARMUP: timeToResetTo = prev.settings.quarterDuration; break;
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
        if (!newIsOvertime) {
            if (newQuarter < prev.settings.quarters) { newQuarter++; newTime = prev.settings.quarterDuration; description = `Avanzado a Cuarto ${newQuarter}.`; } 
            else { newIsOvertime = true; newQuarter++; newTime = prev.settings.overtimeDuration; description = `Avanzado a Prórroga ${newQuarter - prev.settings.quarters}.`; }
        } else { newQuarter++; newTime = prev.settings.overtimeDuration; description = `Avanzado a Prórroga ${newQuarter - prev.settings.quarters}.`; }
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
  
  const handleEndGameConfirm = () => {
    if (gameData) {
      let finalWinningTeam: 'home' | 'away' | 'tie' | null = null;
      if (gameData.homeTeam.score > gameData.awayTeam.score) finalWinningTeam = 'home';
      else if (gameData.awayTeam.score > gameData.homeTeam.score) finalWinningTeam = 'away';
      else finalWinningTeam = 'tie';
      const endGameAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', payload: { phase: GamePhase.FINISHED, action: 'game_ended', homeScore: gameData.homeTeam.score, awayScore: gameData.awayTeam.score, winningTeam: finalWinningTeam }, description: `Partido finalizado. Marcador: ${gameData.homeTeam.name} ${gameData.homeTeam.score} - ${gameData.awayTeam.name} ${gameData.awayTeam.score}.` };
      const finalGameData = { ...gameData, gamePhase: GamePhase.FINISHED, endTime: new Date().toISOString(), timerIsRunning: false, lastTickTimestamp: null, winningTeam: finalWinningTeam, gameLog: [...gameData.gameLog, endGameAction] };
      onGameEnd(finalGameData);
      navigate('/history');
    }
    setShowConfirmEndGame(false);
  };
  
  const getLeadingScorers = (team: TeamGameInfo): string[] => {
    if (!team || !team.stats || Object.keys(team.stats).length === 0) return [];
    let maxPoints = 0;
    Object.values(team.stats).forEach(playerStat => { const points = calculatePlayerPoints(playerStat); if (points > maxPoints) maxPoints = points; });
    if (maxPoints === 0) return []; 
    return Object.keys(team.stats).filter(playerId => calculatePlayerPoints(team.stats[playerId]) === maxPoints);
  };

  const toggleTeamOrder = () => setIsTeamOrderSwapped(prev => !prev);

  if (!gameData) return <div className="flex flex-col items-center justify-center h-full"><p className={`text-xl ${textSecondary} mb-4`}>No hay datos del partido.</p><Link to="/setup" className={`px-6 py-3 ${buttonAccent} text-white rounded-md hover:bg-opacity-90`}>Configurar Nuevo Partido</Link></div>;

  const currentTeamDisplay = activeTab === 'home' ? gameData.homeTeam : gameData.awayTeam;
  const leadingScorersForCurrentTeam = getLeadingScorers(currentTeamDisplay);
  const teamLeft = isTeamOrderSwapped ? gameData.awayTeam : gameData.homeTeam;
  const teamRight = isTeamOrderSwapped ? gameData.homeTeam : gameData.awayTeam;
  const teamLeftType = isTeamOrderSwapped ? 'away' : 'home';
  const teamRightType = isTeamOrderSwapped ? 'home' : 'away';

  const shortcutButtonClass = "p-1.5 text-xs text-white rounded shadow focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50";

  return (
    <div className="space-y-4 md:space-y-6">
      <TimerDisplay gameData={gameData} onStartTimer={handleStartTimer} onPauseTimer={handlePauseTimer} onResetTimer={handleResetTimer} onGoToNextPeriod={handleGoToNextPeriod} onGoToPrevPeriod={handleGoToPrevPeriod} />
      
      <div className="relative">
         <div className="grid grid-cols-2 gap-4">
            <TeamDisplay 
              team={teamLeft} 
              gameSettings={gameData.settings} 
              opponentFoulsThisQuarter={teamRight.foulsThisQuarter} 
            />
            <TeamDisplay 
              team={teamRight} 
              gameSettings={gameData.settings} 
              opponentFoulsThisQuarter={teamLeft.foulsThisQuarter}
            />
        </div>
        <button onClick={toggleTeamOrder} className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 ${bgSlate700} ${hoverBgSlate600} text-brand-text-primary-light dark:text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent`} aria-label="Intercambiar posición de equipos"><SwapIcon className="w-5 h-5" /></button>
      </div>

      <div className={`${bgSurface} rounded-lg shadow-md`}>
        <div className={`flex border-b ${borderSlate700}`}>
          <button onClick={() => setActiveTab(teamLeftType)} className={`flex-1 py-3 px-2 text-center transition-colors duration-150 ${activeTab === teamLeftType ? `${buttonAccent} text-white font-semibold` : `${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50`}`}>{teamLeft.name}</button>
          <button onClick={() => setActiveTab(teamRightType)} className={`flex-1 py-3 px-2 text-center transition-colors duration-150 ${activeTab === teamRightType ? `${buttonAccent} text-white font-semibold` : `${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50`}`}>{teamRight.name}</button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h4 className={`text-lg font-semibold ${textPrimary} mb-2`}>En Cancha ({currentTeamDisplay.onCourt.length})</h4>
            {currentTeamDisplay.onCourt.length === 0 && <p className={`text-sm ${textSecondary}`}>Nadie en cancha.</p>}
            <ul className="space-y-2">
              {currentTeamDisplay.onCourt.map(player => {
                 const stats = currentTeamDisplay.stats[player.id] || initialPlayerStats;
                 const points = calculatePlayerPoints(stats);
                 const isEffectivelyFouledOut = gameData.settings.allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= gameData.settings.maxPersonalFouls;
                 const isLeadingScorer = leadingScorersForCurrentTeam.includes(player.id);
                 const isDisabled = gameData.gamePhase === GamePhase.FINISHED || isEffectivelyFouledOut;

                 return (
                    <li key={player.id} className={`flex items-center justify-between p-2 rounded-md ${isLeadingScorer ? 'bg-yellow-600/30 dark:bg-yellow-700/40 border-l-4 border-yellow-500' : bgSlate700} ${!isDisabled ? hoverBgSlate600 : ''}`}>
                      <div className={`flex-grow truncate ${isEffectivelyFouledOut ? 'text-red-500 line-through' : textPrimary}`}>
                        {isLeadingScorer && <span className="text-yellow-400 font-bold">★ </span>}
                        #{player.number} {player.name} 
                        <span className={`text-xs ${textSecondary} ml-2`}>{points} pts, {stats[StatType.FOULS_PERSONAL] || 0} PF</span>
                      </div>
                      <div className="flex items-center space-x-1.5 ml-2 flex-shrink-0">
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_2_MADE, 2)} disabled={isDisabled} className={`${shortcutButtonClass} bg-green-600 hover:bg-green-500 focus:ring-green-400`} aria-label="+2 Puntos"> +2 </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_3_MADE, 3)} disabled={isDisabled} className={`${shortcutButtonClass} bg-blue-600 hover:bg-blue-500 focus:ring-blue-400`} aria-label="+3 Puntos"> +3 </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.REBOUNDS_DEFENSIVE)} disabled={isDisabled} className={`${shortcutButtonClass} bg-orange-500 hover:bg-orange-400 focus:ring-orange-300`} aria-label="Rebote Defensivo"> R </button>
                        <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.ASSISTS)} disabled={isDisabled} className={`${shortcutButtonClass} bg-purple-600 hover:bg-purple-500 focus:ring-purple-400`} aria-label="Asistencia"> A </button>
                        <button onClick={() => openStatsModal(player, activeTab)} disabled={isDisabled} className={`p-1.5 bg-brand-button-light dark:bg-brand-button hover:bg-brand-button-hover-light dark:hover:bg-brand-button-hover text-brand-text-primary-light dark:text-white rounded shadow disabled:opacity-50 flex items-center justify-center`} aria-label={`Estadísticas completas para ${player.name}`}>
                          <StatsChartIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                 );
              })}
            </ul>
          </div>

          <div>
            <h4 className={`text-lg font-semibold ${textPrimary} mb-2`}>Banca ({currentTeamDisplay.bench.length} / Total Equipo: {currentTeamDisplay.players.length})</h4>
            {currentTeamDisplay.bench.length === 0 && <p className={`text-sm ${textSecondary}`}>Banca vacía.</p>}
            <ul className="space-y-2">{currentTeamDisplay.bench.map(player => (<li key={player.id} className={`flex items-center justify-between p-2 ${bgSlate700} rounded-md ${hoverBgSlate600}`}><span className={`${textPrimary} truncate`}>#{player.number} {player.name}</span></li>))}</ul>
          </div>

          <div className={`flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 pt-3 border-t ${borderSlate700}`}>
            <button onClick={() => openSubModal(activeTab)} disabled={gameData.gamePhase === GamePhase.FINISHED} className={`flex-1 py-2 px-3 ${buttonPrimary} rounded-md text-sm disabled:opacity-50`}>Sustitución</button>
            <button onClick={() => openAddPlayerFromRosterModal(activeTab)} disabled={gameData.gamePhase === GamePhase.FINISHED} className={`flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm disabled:opacity-50 flex items-center justify-center`}><PlusIcon className="w-4 h-4 mr-1" /> Añadir Jugador (Plantilla)</button>
          </div>
        </div>
      </div>
      
      {gameData.gamePhase !== GamePhase.FINISHED && <button onClick={() => setShowConfirmEndGame(true)} className={`w-full mt-6 py-3 px-6 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transition-colors`}>Finalizar Partido</button>}
      {gameData.gamePhase === GamePhase.FINISHED && <Link to="/history" className={`block w-full mt-6 py-3 px-6 ${buttonPrimary} text-center font-bold rounded-lg shadow-lg transition-colors`}>Ver Historial de Partidos</Link>}

      {isStatsModalOpen && playerForStats && teamForStatsModal && gameData && (
        <PlayerStatsModal isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} player={playerForStats} teamType={teamForStatsModal} currentStats={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam'].stats[playerForStats.id] || initialPlayerStats} onSaveStats={handleStatUpdate} maxPersonalFouls={gameData.settings.maxPersonalFouls} allowFoulOuts={gameData.settings.allowFoulOuts} />
      )}
      {isSubModalOpen && teamForStatsModal && gameData && (<SubstitutionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} team={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam']} teamType={teamForStatsModal} onConfirmSubstitution={handleSubstitution} />)}
      <ConfirmDialog isOpen={showConfirmEndGame} onClose={() => setShowConfirmEndGame(false)} onConfirm={handleEndGameConfirm} title="Confirmar Finalización" confirmText="Sí, finalizar">¿Estás seguro de que quieres finalizar este partido? No podrás realizar más cambios.</ConfirmDialog>
      <AlertDialog isOpen={alertInfo.isOpen} onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })} title={alertInfo.title}>{alertInfo.message}</AlertDialog>
      {teamToAddTo && gameData && (<AddPlayerToGameTeamModal isOpen={isAddPlayerModalOpen} onClose={() => { setIsAddPlayerModalOpen(false); setTeamToAddTo(null); }} teamType={teamToAddTo} currentTeamName={teamToAddTo === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name} playersAlreadyInGameTeam={teamToAddTo === 'home' ? gameData.homeTeam.players : gameData.awayTeam.players} globalRoster={roster} onAddPlayers={handleAddPlayersFromRosterToGameTeam} unavailablePlayerIds={teamToAddTo === 'home' ? gameData.awayTeam.players.map(p=>p.id) : gameData.homeTeam.players.map(p=>p.id)} />)}
    </div>
  );
};

export default GamePage;
