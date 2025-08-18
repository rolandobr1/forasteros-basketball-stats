import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Game, Player, GamePhase, TeamType, StatType, PlayerStats, TeamGameInfo, initialPlayerStats, GameSettings, GameAction, StatUpdatePayload, ScoreUpdatePayload, FoulUpdatePayload, SubstitutionPayload, TimerChangePayload, PlayerAddedToTeamPayload } from '../types';
import TimerDisplay from '../components/TimerDisplay';
import TeamDisplay from '../components/TeamDisplay';
import PlayerStatsModal from '../components/PlayerStatsModal';
import SubstitutionModal from '../components/SubstitutionModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';
import AddPlayerToGameTeamModal from '../components/AddPlayerToGameTeamModal';
// EditGameActionModal removed
import { PlusIcon, StatsChartIcon, SwapIcon, formatTime, formatActionTime, recalculateGameStateFromLog, ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeSlashIcon, ExportIcon, ArrowUturnLeftIcon } from '../utils'; // Added ArrowUturnLeftIcon
import { STAT_TYPE_LABELS } from '../constants'; // Added import

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

type ShortcutActionKey = 'plus1' | 'plus2' | 'plus3' | 'rebound' | 'assist' | 'steal' | 'block' | 'foul';
interface LastShortcutAction {
  playerId: string;
  teamType: TeamType;
  actionKey: ShortcutActionKey;
}

const generatePlayByPlayCSV = (game: Game): string => {
  if (!game) return "";
  let csvContent = "data:text/csv;charset=utf-8,";
  
  const safeToString = (val: any) => val === null || val === undefined ? '' : String(val);
  const escapeCsvField = (field: any) => `"${safeToString(field).replace(/"/g, '""')}"`;

  const headerTexts = [
    "Identificador de Acción", // Changed from "ID Acción"
    "Timestamp", 
    "Periodo", 
    "Crono del Periodo", 
    "Tipo de Acción", 
    "Descripción Detallada", 
    "Equipo Implicado", 
    "Pts Local (Tras Acción)", 
    "Pts Visitante (Tras Acción)"
  ];
  const headers = headerTexts.map(escapeCsvField).join(',') + "\n";
  csvContent += headers;


  game.gameLog.forEach(action => {
    const payload = action.payload; 

    let periodDisplay = 'N/A';
    if ('quarter' in payload && typeof payload.quarter === 'number' && 
        'isOvertime' in payload && typeof payload.isOvertime === 'boolean') {
      const { quarter, isOvertime } = payload; // Destructure after type guard
      periodDisplay = `${isOvertime ? 'OT' : 'Q'}${quarter - (isOvertime ? game.settings.quarters : 0)}`;
    }
      
    let cronoDisplay = 'N/A';
    if ('timeRemainingInPhase' in payload && typeof payload.timeRemainingInPhase === 'number') {
      cronoDisplay = formatTime(payload.timeRemainingInPhase);
    } 
    else if (action.type === 'timer_change' && 'time' in payload && typeof payload.time === 'number') {
      cronoDisplay = formatTime(payload.time);
    }
    else if (action.type === 'timer_change' && 'action' in payload && payload.action === 'reset' && 'newTime' in payload && typeof payload.newTime === 'number') {
        cronoDisplay = formatTime(payload.newTime);
    }

    let teamNameDisplay = '';
    if (action.teamId) {
        teamNameDisplay = action.teamId === 'home' ? game.homeTeam.name : game.awayTeam.name;
    } 
    else if ('teamId' in payload && payload.teamId) { // Check if payload has teamId (not all do, e.g. TimerChangePayload)
        const currentPayloadTeamId = payload.teamId; // Local const for type safety
        if (currentPayloadTeamId) { // Check if it's not undefined (due to Partial)
            teamNameDisplay = currentPayloadTeamId === 'home' ? game.homeTeam.name : game.awayTeam.name;
        }
    }

    let homeScoreAtActionDisplay = '';
    if ('homeScoreAtAction' in payload && typeof payload.homeScoreAtAction === 'number') {
        homeScoreAtActionDisplay = String(payload.homeScoreAtAction);
    }

    let awayScoreAtActionDisplay = '';
    if ('awayScoreAtAction' in payload && typeof payload.awayScoreAtAction === 'number') {
        awayScoreAtActionDisplay = String(payload.awayScoreAtAction);
    }

    const row = [
      action.id,
      new Date(action.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }),
      periodDisplay,
      cronoDisplay,
      action.type,
      action.description,
      teamNameDisplay,
      homeScoreAtActionDisplay,
      awayScoreAtActionDisplay,
    ].map(escapeCsvField).join(',') + "\n";
    csvContent += row;
  });

  return csvContent;
};


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

  const [isPlayByPlayExpanded, setIsPlayByPlayExpanded] = useState(false);


  const currentTeamDisplay = useMemo(() => gameData ? (activeTab === 'home' ? gameData.homeTeam : gameData.awayTeam) : null, [gameData, activeTab]);
  
  const getLeadingScorers = useCallback((team: TeamGameInfo): string[] => {
    if (!team || !team.stats || Object.keys(team.stats).length === 0) return [];
    let maxPoints = 0;
    Object.values(team.stats).forEach(playerStat => { const points = calculatePlayerPoints(playerStat); if (points > maxPoints) maxPoints = points; });
    if (maxPoints === 0) return []; 
    return Object.keys(team.stats).filter(playerId => calculatePlayerPoints(team.stats[playerId]) === maxPoints);
  }, []);

  const leadingScorersForCurrentTeam = useMemo(() => currentTeamDisplay ? getLeadingScorers(currentTeamDisplay) : [], [currentTeamDisplay, getLeadingScorers]);
  
  const teamLeft = useMemo(() => gameData ? (isTeamOrderSwapped ? gameData.awayTeam : gameData.homeTeam) : null, [isTeamOrderSwapped, gameData]);
  const teamRight = useMemo(() => gameData ? (isTeamOrderSwapped ? gameData.homeTeam : gameData.awayTeam) : null, [isTeamOrderSwapped, gameData]);
  const teamLeftType: TeamType = useMemo(() => isTeamOrderSwapped ? 'away' : 'home', [isTeamOrderSwapped]);
  const teamRightType: TeamType = useMemo(() => isTeamOrderSwapped ? 'home' : 'away', [isTeamOrderSwapped]);

  useEffect(() => {
    return () => { 
      if (lastActionClearTimeoutRef.current) {
        clearTimeout(lastActionClearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => { if (!gameData) navigate('/setup'); }, [gameData, navigate]);

  const handleStatUpdate = useCallback((player: Player, teamType: TeamType, newStatsForPlayer: PlayerStats) => {
    if (!gameData) return;
    const playerId = player.id;
    const oldTeamData = teamType === 'home' ? gameData.homeTeam : gameData.awayTeam;
    const oldPlayerStats = oldTeamData.stats[playerId] || initialPlayerStats;
    
    let changedStatType: StatType | null = null;
    let valueChange = 0;
    let pointsChange = 0; 
    let specificActionType: GameAction['type'] = 'stat_update';
    let description = "";

    const oldPointsFromStat = calculatePlayerPoints(oldPlayerStats);
    const newPointsFromStat = calculatePlayerPoints(newStatsForPlayer);
    if (newPointsFromStat !== oldPointsFromStat) {
      pointsChange = newPointsFromStat - oldPointsFromStat;
      specificActionType = 'score_update';
      if (newStatsForPlayer[StatType.POINTS_1_MADE] !== oldPlayerStats[StatType.POINTS_1_MADE]) changedStatType = StatType.POINTS_1_MADE;
      else if (newStatsForPlayer[StatType.POINTS_2_MADE] !== oldPlayerStats[StatType.POINTS_2_MADE]) changedStatType = StatType.POINTS_2_MADE;
      else if (newStatsForPlayer[StatType.POINTS_3_MADE] !== oldPlayerStats[StatType.POINTS_3_MADE]) changedStatType = StatType.POINTS_3_MADE;
      valueChange = changedStatType ? newStatsForPlayer[changedStatType] - (oldPlayerStats[changedStatType] || 0) : 0;
      description = `${player.name} (${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}) ${pointsChange > 0 ? 'anotó' : 'se le corrigieron'} ${Math.abs(pointsChange)} punto(s).`;
    } else { 
        for (const key in newStatsForPlayer) {
            const statKey = key as StatType;
            if (newStatsForPlayer[statKey] !== (oldPlayerStats[statKey] || 0)) {
                changedStatType = statKey;
                valueChange = newStatsForPlayer[statKey] - (oldPlayerStats[statKey] || 0);
                if (statKey === StatType.FOULS_PERSONAL) {
                     specificActionType = 'foul_update';
                     description = `${player.name} cometió ${valueChange > 0 ? valueChange : 'corregida'} falta(s).`;
                } else {
                     description = `${player.name} registró ${valueChange > 0 ? '+' : ''}${valueChange} en ${STAT_TYPE_LABELS[statKey]}.`;
                }
                break;
            }
        }
    }
    
    if (changedStatType) {
        const gameActionPayload: Partial<StatUpdatePayload | ScoreUpdatePayload | FoulUpdatePayload> = {
            teamId: teamType, playerId: playerId, quarter: gameData.currentQuarter, 
            isOvertime: gameData.isOvertime, timeRemainingInPhase: gameData.currentTimeRemainingInPhase,
            homeScoreAtAction: gameData.homeTeam.score + (teamType === 'home' && specificActionType === 'score_update' ? pointsChange : 0), // Score *after* this action
            awayScoreAtAction: gameData.awayTeam.score + (teamType === 'away' && specificActionType === 'score_update' ? pointsChange : 0),
        };
        if (specificActionType === 'score_update') {
            (gameActionPayload as ScoreUpdatePayload).pointsScored = pointsChange;
            (gameActionPayload as ScoreUpdatePayload).statType = changedStatType; 
        } else if (specificActionType === 'foul_update') {
            (gameActionPayload as FoulUpdatePayload).foulsAdded = valueChange;
            (gameActionPayload as FoulUpdatePayload).newTotalPersonalFouls = newStatsForPlayer[StatType.FOULS_PERSONAL];
        } else { 
            (gameActionPayload as StatUpdatePayload).statType = changedStatType;
            (gameActionPayload as StatUpdatePayload).valueChange = valueChange;
            (gameActionPayload as StatUpdatePayload).pointsChange = 0; 
        }

        const newGameAction: GameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: specificActionType, payload: gameActionPayload, description };
        
        setGameData(prevGame => {
            if (!prevGame) return null;
            const updatedLog = [...prevGame.gameLog, newGameAction];
            const { homeTeam: newHomeTeam, awayTeam: newAwayTeam } = recalculateGameStateFromLog(
                prevGame.settings, 
                prevGame.homeTeam.players, 
                prevGame.awayTeam.players, 
                updatedLog
            );
            newHomeTeam.name = prevGame.homeTeam.name;
            newAwayTeam.name = prevGame.awayTeam.name;
            newHomeTeam.onCourt = prevGame.homeTeam.onCourt; 
            newHomeTeam.bench = prevGame.homeTeam.bench;
            newAwayTeam.onCourt = prevGame.awayTeam.onCourt;
            newAwayTeam.bench = prevGame.awayTeam.bench;

            return { ...prevGame, homeTeam: newHomeTeam, awayTeam: newAwayTeam, gameLog: updatedLog };
        });
    } else { 
         setGameData(prevGame => {
            if (!prevGame) return null;
            const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
            const teamToUpdate = prevGame[teamKey];
            const updatedTeamStatsMap = { ...teamToUpdate.stats, [playerId]: newStatsForPlayer };
            const newTeamScore = Object.values(updatedTeamStatsMap).reduce((sum, ps) => sum + calculatePlayerPoints(ps as PlayerStats), 0);
            return {...prevGame, [teamKey]: {...teamToUpdate, stats: updatedTeamStatsMap, score: newTeamScore }}
         });
    }

  }, [gameData, setGameData]);

  const handleShortcutStatClick = useCallback((
    player: Player, 
    teamType: TeamType, 
    statTypeForAction: StatType.POINTS_1_MADE | StatType.POINTS_2_MADE | StatType.POINTS_3_MADE | StatType.REBOUNDS_DEFENSIVE | StatType.ASSISTS | StatType.STEALS | StatType.BLOCKS | StatType.FOULS_PERSONAL, 
    actionKey: ShortcutActionKey,
    pointsValue?: 1 | 2 | 3
  ) => {
    if (!gameData || (gameData.gamePhase !== GamePhase.IN_PROGRESS && gameData.gamePhase !== GamePhase.TIMEOUT)) {
      setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Solo se pueden registrar estadísticas durante el juego activo o tiempos muertos."}); return;
    }
    const teamToCheckKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
    if (gameData.settings.allowFoulOuts && (gameData[teamToCheckKey].stats[player.id]?.[StatType.FOULS_PERSONAL] || 0) >= gameData.settings.maxPersonalFouls) {
      setAlertInfo({isOpen: true, title: "Jugador Expulsado", message: `${player.name} está expulsado y no puede registrar más estadísticas.`}); return;
    }

    let gameAction: GameAction | null = null;
    let logDescriptionPart = ""; 
    let actionSpecificType: GameAction['type'] = 'stat_update';
    
    const commonPayloadBase = { 
        teamId: teamType, playerId: player.id, 
        quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime, 
        timeRemainingInPhase: gameData.currentTimeRemainingInPhase,
    };
    let payloadWithScores = { // Scores *after* this action
        ...commonPayloadBase,
        homeScoreAtAction: gameData.homeTeam.score,
        awayScoreAtAction: gameData.awayTeam.score,
    };


    switch (statTypeForAction) {
        case StatType.POINTS_1_MADE:
            logDescriptionPart = "+1 Pto"; actionSpecificType = 'score_update';
            if(teamType === 'home') payloadWithScores.homeScoreAtAction +=1; else payloadWithScores.awayScoreAtAction +=1;
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: actionSpecificType, 
                           payload: { ...payloadWithScores, pointsScored: 1, statType: StatType.POINTS_1_MADE } as ScoreUpdatePayload, 
                           description: "" }; break;
        case StatType.POINTS_2_MADE:
            logDescriptionPart = "+2 Pts"; actionSpecificType = 'score_update';
            if(teamType === 'home') payloadWithScores.homeScoreAtAction +=2; else payloadWithScores.awayScoreAtAction +=2;
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: actionSpecificType, 
                           payload: { ...payloadWithScores, pointsScored: 2, statType: StatType.POINTS_2_MADE } as ScoreUpdatePayload, 
                           description: "" }; break;
        case StatType.POINTS_3_MADE:
            logDescriptionPart = "+3 Pts"; actionSpecificType = 'score_update';
            if(teamType === 'home') payloadWithScores.homeScoreAtAction +=3; else payloadWithScores.awayScoreAtAction +=3;
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: actionSpecificType, 
                           payload: { ...payloadWithScores, pointsScored: 3, statType: StatType.POINTS_3_MADE } as ScoreUpdatePayload, 
                           description: "" }; break;
        case StatType.REBOUNDS_DEFENSIVE: 
            logDescriptionPart = "+1 Reb Def";
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'stat_update', 
                           payload: { ...payloadWithScores, statType: StatType.REBOUNDS_DEFENSIVE, valueChange: 1, pointsChange: 0 } as StatUpdatePayload, 
                           description: "" }; break;
        case StatType.ASSISTS: 
            logDescriptionPart = "+1 Ast";
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'stat_update', 
                           payload: { ...payloadWithScores, statType: StatType.ASSISTS, valueChange: 1, pointsChange: 0 } as StatUpdatePayload, 
                           description: "" }; break;
        case StatType.STEALS: 
            logDescriptionPart = "+1 Robo";
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'stat_update', 
                           payload: { ...payloadWithScores, statType: StatType.STEALS, valueChange: 1, pointsChange: 0 } as StatUpdatePayload, 
                           description: "" }; break;
        case StatType.BLOCKS: 
            logDescriptionPart = "+1 Bloqueo";
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: 'stat_update', 
                           payload: { ...payloadWithScores, statType: StatType.BLOCKS, valueChange: 1, pointsChange: 0 } as StatUpdatePayload, 
                           description: "" }; break;
        case StatType.FOULS_PERSONAL: 
            logDescriptionPart = "+1 Falta Pers."; actionSpecificType = 'foul_update';
            const currentFouls = gameData[teamType === 'home' ? 'homeTeam' : 'awayTeam'].stats[player.id]?.[StatType.FOULS_PERSONAL] || 0;
            gameAction = { id: crypto.randomUUID(), timestamp: Date.now(), type: actionSpecificType, 
                           payload: { ...payloadWithScores, foulsAdded: 1, newTotalPersonalFouls: currentFouls + 1 } as FoulUpdatePayload, 
                           description: "" }; break;
        default: return;
    }

    if (gameAction) {
        const teamNameForLog = teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name;
        gameAction.description = `${player.name} (${logDescriptionPart}) - ${teamNameForLog}.`;
        
        setGameData(prevGame => {
            if (!prevGame) return null;
            const updatedLog = [...prevGame.gameLog, gameAction!];
            const { homeTeam: newHomeTeam, awayTeam: newAwayTeam } = recalculateGameStateFromLog(
                prevGame.settings,
                prevGame.homeTeam.players,
                prevGame.awayTeam.players,
                updatedLog
            );
             newHomeTeam.name = prevGame.homeTeam.name; newAwayTeam.name = prevGame.awayTeam.name;
             newHomeTeam.onCourt = prevGame.homeTeam.onCourt; newHomeTeam.bench = prevGame.homeTeam.bench;
             newAwayTeam.onCourt = prevGame.awayTeam.onCourt; newAwayTeam.bench = prevGame.awayTeam.bench;

            return { ...prevGame, homeTeam: newHomeTeam, awayTeam: newAwayTeam, gameLog: updatedLog };
        });
    }

    if (lastActionClearTimeoutRef.current) clearTimeout(lastActionClearTimeoutRef.current);
    setLastShortcutAction({ playerId: player.id, teamType, actionKey });
    lastActionClearTimeoutRef.current = window.setTimeout(() => setLastShortcutAction(null), 2500);

  }, [gameData, setGameData, lastActionClearTimeoutRef]);

  const handleSubstitution = useCallback((teamType: TeamType, playerIn: Player, playerOut: Player) => {
    if (!gameData) return;
    const substitutionAction: GameAction = { 
        id: crypto.randomUUID(), timestamp: Date.now(), type: 'substitution', 
        payload: { 
            teamId: teamType, playerInId: playerIn.id, playerInName: playerIn.name, 
            playerOutId: playerOut.id, playerOutName: playerOut.name, 
            quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime, 
            timeRemainingInPhase: gameData.currentTimeRemainingInPhase,
            homeScoreAtAction: gameData.homeTeam.score, 
            awayScoreAtAction: gameData.awayTeam.score,
        } as SubstitutionPayload, 
        description: `Sustitución (${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}): Entra ${playerIn.name}, Sale ${playerOut.name}` 
    };
    setGameData(prevGame => {
        if (!prevGame) return null;
        const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
        const currentTeam = prevGame[teamKey];
        const newOnCourt = currentTeam.onCourt.filter(p => p.id !== playerOut.id).concat(playerIn);
        const newBench = currentTeam.bench.filter(p => p.id !== playerIn.id).concat(playerOut);
        return { ...prevGame, [teamKey]: { ...currentTeam, onCourt: newOnCourt, bench: newBench }, gameLog: [...prevGame.gameLog, substitutionAction] };
    });
  }, [gameData, setGameData]);

  const handleAddPlayersFromRosterToGameTeam = useCallback((teamType: TeamType, playersToAdd: Player[]) => {
    if (!gameData) return;
    const newActions: GameAction[] = [];
    playersToAdd.forEach(player => {
        const addPlayerAction: GameAction = { 
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'player_added_to_team', 
            payload: { 
                teamId: teamType, playerId: player.id, playerName: player.name, 
                quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime, 
                timeRemainingInPhase: gameData.currentTimeRemainingInPhase,
                homeScoreAtAction: gameData.homeTeam.score, 
                awayScoreAtAction: gameData.awayTeam.score,
            } as PlayerAddedToTeamPayload, 
            description: `${player.name} añadido a ${teamType === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}.` 
        };
        newActions.push(addPlayerAction);
    });

    setGameData(prevGame => {
      if (!prevGame) return null;
      const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
      const currentTeam = prevGame[teamKey];
      const newTeamPlayersList = [...currentTeam.players]; 
      const newBenchList = [...currentTeam.bench]; 
      
      playersToAdd.forEach(player => { 
        if (!newTeamPlayersList.find(p => p.id === player.id)) { 
          newTeamPlayersList.push(player); newBenchList.push(player); 
        }
      });
      const updatedLog = [...prevGame.gameLog, ...newActions];
      const { homeTeam: newHomeTeam, awayTeam: newAwayTeam } = recalculateGameStateFromLog(
          prevGame.settings,
          prevGame.homeTeam.players, 
          prevGame.awayTeam.players,
          updatedLog
      );
      newHomeTeam.name = prevGame.homeTeam.name; newAwayTeam.name = prevGame.awayTeam.name;
      if(teamType === 'home') {
        newHomeTeam.onCourt = newBenchList.length >= 5 ? newTeamPlayersList.filter(p => prevGame.homeTeam.onCourt.map(oc => oc.id).includes(p.id) || playersToAdd.map(pta => pta.id).includes(p.id)).slice(0,5) : newTeamPlayersList.slice(0,5);
        newHomeTeam.bench = newTeamPlayersList.filter(p => !newHomeTeam.onCourt.map(oc => oc.id).includes(p.id));
        newHomeTeam.players = newTeamPlayersList;
      } else {
        newAwayTeam.onCourt = newBenchList.length >= 5 ? newTeamPlayersList.filter(p => prevGame.awayTeam.onCourt.map(oc => oc.id).includes(p.id) || playersToAdd.map(pta => pta.id).includes(p.id)).slice(0,5) : newTeamPlayersList.slice(0,5);
        newAwayTeam.bench = newTeamPlayersList.filter(p => !newAwayTeam.onCourt.map(oc => oc.id).includes(p.id));
        newAwayTeam.players = newTeamPlayersList;
      }
      
      return { 
          ...prevGame, 
          homeTeam: teamType === 'home' ? newHomeTeam : prevGame.homeTeam,
          awayTeam: teamType === 'away' ? newAwayTeam : prevGame.awayTeam,
          gameLog: updatedLog 
        };
    });
    setIsAddPlayerModalOpen(false); setTeamToAddTo(null);
  }, [gameData, setGameData, roster]);
  
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
  }, [gameData?.gamePhase]);

  const handleStartTimer = useCallback(() => {
    setGameData(prev => { 
      if (!prev || prev.gamePhase === GamePhase.FINISHED) return prev;
      let newPhase = prev.gamePhase; let newTime = prev.currentTimeRemainingInPhase;
      let newQuarter = prev.currentQuarter; let newIsOvertime = prev.isOvertime;
      let newLog = [...prev.gameLog];
      const createTimerAction = (description: string): GameAction => ({ 
          id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', 
          payload: { 
              phase: newPhase, action: 'started', quarter: newQuarter, 
              isOvertime: newIsOvertime, time: newTime,
              homeScoreAtAction: prev.homeTeam.score, awayScoreAtAction: prev.awayTeam.score,
          } as TimerChangePayload, 
          description 
      });
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
      const createTimerAction = (description: string): GameAction => ({ 
          id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', 
          payload: { 
              phase: newPhase, action: 'paused', quarter: prev.currentQuarter, 
              isOvertime: prev.isOvertime, time: prev.currentTimeRemainingInPhase,
              homeScoreAtAction: prev.homeTeam.score, awayScoreAtAction: prev.awayTeam.score,
          } as TimerChangePayload, 
          description 
      });
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
        const resetAction: GameAction = { 
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', 
            payload: { 
                phase: prev.gamePhase, action: 'reset', quarter: prev.currentQuarter, 
                isOvertime: prev.isOvertime, oldTime: prev.currentTimeRemainingInPhase, newTime: timeToResetTo,
                homeScoreAtAction: prev.homeTeam.score, awayScoreAtAction: prev.awayTeam.score,
            } as TimerChangePayload, 
            description: `Temporizador reseteado para ${prev.gamePhase} a ${formatTime(timeToResetTo)}.` 
        };
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
        } else { 
            newQuarter++; newTime = prev.settings.overtimeDuration; description = `Avanzado a Prórroga ${newQuarter - prev.settings.quarters}.`; }
        const periodChangeAction: GameAction = { 
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', 
            payload: { 
                phase: newPhase, action: 'period_advanced', oldQuarter: prev.currentQuarter, 
                newQuarter: newQuarter, isOvertime: newIsOvertime,
                homeScoreAtAction: prev.homeTeam.score, awayScoreAtAction: prev.awayTeam.score,
            } as TimerChangePayload, 
            description 
        };
        return { ...prev, currentQuarter: newQuarter, isOvertime: newIsOvertime, gamePhase: newPhase, currentTimeRemainingInPhase: newTime, timerIsRunning: false, lastTickTimestamp: null, homeTeam: { ...prev.homeTeam, foulsThisQuarter: 0 }, awayTeam: { ...prev.awayTeam, foulsThisQuarter: 0 }, gameLog: [...prev.gameLog, periodChangeAction] };
    });
  }, [setGameData]);

  const handleGoToPrevPeriod = useCallback(() => {
    setGameData(prev => { 
        if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning || (prev.currentQuarter === 1 && !prev.isOvertime && ![GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK].includes(prev.gamePhase) )) return prev;
        let newQuarter = prev.currentQuarter; let newIsOvertime = prev.isOvertime;
        let newTime = 0; let newPhase = GamePhase.IN_PROGRESS; let description = "";
        if (newIsOvertime) { 
            if (newQuarter > prev.settings.quarters + 1) { newQuarter--; newTime = prev.settings.overtimeDuration; description = `Retrocedido a Prórroga ${newQuarter - prev.settings.quarters}.`; } 
            else { newIsOvertime = false; newQuarter = prev.settings.quarters; newTime = prev.settings.quarterDuration; description = `Retrocedido a Cuarto ${newQuarter}.`; }
        } else { newQuarter--; newTime = prev.settings.quarterDuration; description = `Retrocedido a Cuarto ${newQuarter}.`; }
        const periodChangeAction: GameAction = { 
            id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', 
            payload: { 
                phase: newPhase, action: 'period_reverted', oldQuarter: prev.currentQuarter, 
                newQuarter: newQuarter, isOvertime: newIsOvertime,
                homeScoreAtAction: prev.homeTeam.score, awayScoreAtAction: prev.awayTeam.score,
            } as TimerChangePayload, 
            description 
        };
        return { ...prev, currentQuarter: newQuarter, isOvertime: newIsOvertime, gamePhase: newPhase, currentTimeRemainingInPhase: newTime, timerIsRunning: false, lastTickTimestamp: null, homeTeam: { ...prev.homeTeam, foulsThisQuarter: 0 }, awayTeam: { ...prev.awayTeam, foulsThisQuarter: 0 }, gameLog: [...prev.gameLog, periodChangeAction] };
    });
  }, [setGameData]);
  
  const handleEndGameConfirm = useCallback(() => {
    if (gameData) {
      let finalWinningTeam: 'home' | 'away' | 'tie' | null = null;
      if (gameData.homeTeam.score > gameData.awayTeam.score) finalWinningTeam = 'home';
      else if (gameData.awayTeam.score > gameData.homeTeam.score) finalWinningTeam = 'away';
      else finalWinningTeam = 'tie';
      const endGameAction: GameAction = { 
          id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change', 
          payload: { 
              phase: GamePhase.FINISHED, action: 'game_ended', homeScore: gameData.homeTeam.score, 
              awayScore: gameData.awayTeam.score, winningTeam: finalWinningTeam,
              quarter: gameData.currentQuarter, isOvertime: gameData.isOvertime,
              homeScoreAtAction: gameData.homeTeam.score, awayScoreAtAction: gameData.awayTeam.score,
          } as TimerChangePayload, 
          description: `Partido finalizado.` 
      };
      const finalGameData = { ...gameData, gamePhase: GamePhase.FINISHED, endTime: new Date().toISOString(), timerIsRunning: false, lastTickTimestamp: null, winningTeam: finalWinningTeam, gameLog: [...gameData.gameLog, endGameAction] };
      onGameEnd(finalGameData);
    }
    setShowConfirmEndGame(false);
  }, [gameData, onGameEnd]);

  const handleExportPlayByPlayCSV = useCallback(() => {
    if (!gameData) return;
    const csvData = generatePlayByPlayCSV(gameData);
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const gameNameForFile = gameData.settings.gameName || `partido_${gameData.homeTeam.name}_vs_${gameData.awayTeam.name}`;
    link.setAttribute("download", `play_by_play_${gameNameForFile.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${gameData.id.substring(0,6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [gameData]);

  const handleUndoLastAction = useCallback(() => {
    setGameData(prevGame => {
      if (!prevGame || prevGame.gameLog.length === 0 || prevGame.gamePhase === GamePhase.FINISHED) {
        if (prevGame && prevGame.gameLog.length === 0) {
            setAlertInfo({ isOpen: true, title: "Sin Acciones", message: "No hay acciones para deshacer." });
        } else if (prevGame && prevGame.gamePhase === GamePhase.FINISHED) {
            setAlertInfo({ isOpen: true, title: "Partido Finalizado", message: "No se pueden deshacer acciones en un partido finalizado." });
        }
        return prevGame;
      }

      const undoneAction = prevGame.gameLog[prevGame.gameLog.length - 1];
      const newGameLog = prevGame.gameLog.slice(0, -1);

      const { homeTeam: updatedHomeTeamInfo, awayTeam: updatedAwayTeamInfo } = recalculateGameStateFromLog(
        prevGame.settings,
        prevGame.homeTeam.players,
        prevGame.awayTeam.players,
        newGameLog
      );
      
      const fullyUpdatedHomeTeam = {
        ...prevGame.homeTeam,
        stats: updatedHomeTeamInfo.stats,
        score: updatedHomeTeamInfo.score,
        onCourt: updatedHomeTeamInfo.onCourt,
        bench: updatedHomeTeamInfo.bench,
        foulsThisQuarter: updatedHomeTeamInfo.foulsThisQuarter,
      };
      const fullyUpdatedAwayTeam = {
        ...prevGame.awayTeam,
        stats: updatedAwayTeamInfo.stats,
        score: updatedAwayTeamInfo.score,
        onCourt: updatedAwayTeamInfo.onCourt,
        bench: updatedAwayTeamInfo.bench,
        foulsThisQuarter: updatedAwayTeamInfo.foulsThisQuarter,
      };

      let newCurrentQuarter = prevGame.currentQuarter;
      let newIsOvertime = prevGame.isOvertime;
      let newCurrentTimeRemainingInPhase = prevGame.currentTimeRemainingInPhase;
      let newGamePhase = prevGame.gamePhase;
      let newEndTime = prevGame.endTime;
      let newWinningTeam = prevGame.winningTeam;

      const payload = undoneAction.payload;
      
      // Try to restore time context if the undone action's payload has these properties
      // This primarily targets StatUpdate, ScoreUpdate, FoulUpdate, Substitution, PlayerAddedToTeam actions
      if (payload &&
          'quarter' in payload && typeof payload.quarter === 'number' &&
          'isOvertime' in payload && typeof payload.isOvertime === 'boolean' &&
          'timeRemainingInPhase' in payload && typeof payload.timeRemainingInPhase === 'number'
      ) {
          newCurrentQuarter = payload.quarter;
          newIsOvertime = payload.isOvertime;
          newCurrentTimeRemainingInPhase = payload.timeRemainingInPhase;

          // Game phase logic based on timerIsRunning (or previous state before this action)
          if (![GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK].includes(prevGame.gamePhase)) {
              newGamePhase = prevGame.timerIsRunning ? GamePhase.IN_PROGRESS : GamePhase.TIMEOUT;
          } else {
              newGamePhase = prevGame.gamePhase;
          }
      }
      
      if (undoneAction.type === 'timer_change') {
        const timerPayload = undoneAction.payload as Partial<TimerChangePayload>;
        if (timerPayload.action === 'period_advanced' && typeof timerPayload.oldQuarter === 'number') {
            newCurrentQuarter = timerPayload.oldQuarter;
            newIsOvertime = prevGame.settings.quarters >= newCurrentQuarter ? false : true; 
            newCurrentTimeRemainingInPhase = 0; // Period just ended
            newGamePhase = GamePhase.IN_PROGRESS; // Or appropriate break phase
        } else if (timerPayload.action === 'period_reverted' && typeof timerPayload.oldQuarter === 'number') {
            if (typeof timerPayload.newQuarter === 'number') {
                newCurrentQuarter = timerPayload.newQuarter;
                newIsOvertime = prevGame.settings.quarters >= newCurrentQuarter ? false : true;
                newCurrentTimeRemainingInPhase = newIsOvertime ? prevGame.settings.overtimeDuration : prevGame.settings.quarterDuration;
                newGamePhase = GamePhase.IN_PROGRESS;
            }
        } else if (timerPayload.action === 'game_ended') {
            newGamePhase = GamePhase.IN_PROGRESS; 
            newEndTime = null;
            newWinningTeam = null;
            if (newGameLog.length > 0) {
                const actionBeforeEndPayload = newGameLog[newGameLog.length - 1].payload;
                if (actionBeforeEndPayload && 'timeRemainingInPhase' in actionBeforeEndPayload && typeof actionBeforeEndPayload.timeRemainingInPhase === 'number') {
                    newCurrentTimeRemainingInPhase = actionBeforeEndPayload.timeRemainingInPhase;
                } else if (actionBeforeEndPayload && 'time' in actionBeforeEndPayload && typeof actionBeforeEndPayload.time === 'number') {
                    newCurrentTimeRemainingInPhase = actionBeforeEndPayload.time;
                } else {
                    newCurrentTimeRemainingInPhase = 0;
                }
             } else {
                 newCurrentTimeRemainingInPhase = newIsOvertime ? prevGame.settings.overtimeDuration : prevGame.settings.quarterDuration;
             }
        } else if ((timerPayload.action === 'started' || timerPayload.action === 'paused') && typeof timerPayload.time === 'number') {
            newCurrentTimeRemainingInPhase = timerPayload.time;
            if (timerPayload.action === 'started') newGamePhase = GamePhase.TIMEOUT; 
            else if (timerPayload.action === 'paused') newGamePhase = GamePhase.IN_PROGRESS;
        } else if (timerPayload.action === 'reset' && typeof timerPayload.oldTime === 'number'){
            newCurrentTimeRemainingInPhase = timerPayload.oldTime;
        }
      }

      setAlertInfo({ isOpen: true, title: "Acción Deshecha", message: `La última acción "${undoneAction.description}" ha sido revertida.` });

      return {
        ...prevGame,
        homeTeam: fullyUpdatedHomeTeam,
        awayTeam: fullyUpdatedAwayTeam,
        gameLog: newGameLog,
        currentQuarter: newCurrentQuarter,
        isOvertime: newIsOvertime,
        currentTimeRemainingInPhase: newCurrentTimeRemainingInPhase,
        gamePhase: newGamePhase,
        endTime: newEndTime,
        winningTeam: newWinningTeam,
        timerIsRunning: false, 
        lastTickTimestamp: null,
      };
    });
  }, [setGameData, setAlertInfo]);
  
  const toggleTeamOrder = useCallback(() => setIsTeamOrderSwapped(prev => !prev), []);
  const handleCloseAlert = useCallback(() => setAlertInfo({ ...alertInfo, isOpen: false }), [alertInfo]);
  const handleConfirmEndGameDialog = useCallback(() => setShowConfirmEndGame(false), []);
  const handleCloseStatsModal = useCallback(() => setIsStatsModalOpen(false), []);
  const handleCloseSubModal = useCallback(() => setIsSubModalOpen(false), []);
  const handleCloseAddPlayerModal = useCallback(() => { setIsAddPlayerModalOpen(false); setTeamToAddTo(null); }, []);

  if (!gameData || !currentTeamDisplay || !teamLeft || !teamRight) {
    return (
      <div className="container mx-auto px-4"> {/* Added container for this case */}
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-xl text-gray-600 dark:text-slate-300 mb-4">No hay datos del partido.</p>
          <Link to="/setup" className="px-6 py-3 bg-brand-accent text-white rounded-md hover:bg-opacity-90">Configurar Nuevo Partido</Link>
        </div>
      </div>
    );
  }

  const newShortcutButtonClass = "py-1.5 text-xs font-medium text-white rounded shadow focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 flex items-center justify-center transition-all duration-150";
  const playerListItemBaseClass = "p-2 rounded-md";
  const playerListNormalClass = "bg-gray-100 dark:bg-slate-700";
  const playerListHoverClass = "hover:bg-gray-200 dark:hover:bg-slate-600";
  const playerListLeadingScorerClass = "bg-yellow-100 dark:bg-yellow-700/40 border-l-4 border-yellow-500 dark:border-yellow-500";
  const highlightedButtonClass = "ring-2 ring-yellow-400 dark:ring-yellow-500 scale-105";


  return (
    <>
      <div className="container mx-auto px-4">
        <div className="space-y-4 md:space-y-6 pb-6"> 
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

                     const playerPoints = calculatePlayerPoints(stats);
                     const playerRebounds = (stats[StatType.REBOUNDS_OFFENSIVE] || 0) + (stats[StatType.REBOUNDS_DEFENSIVE] || 0);
                     const playerAssists = stats[StatType.ASSISTS] || 0;
                     const playerSteals = stats[StatType.STEALS] || 0;
                     const playerBlocks = stats[StatType.BLOCKS] || 0;
                     const playerFouls = stats[StatType.FOULS_PERSONAL] || 0;


                     const checkHighlight = (actionKey: ShortcutActionKey) => 
                        lastShortcutAction &&
                        lastShortcutAction.playerId === player.id &&
                        lastShortcutAction.teamType === activeTab &&
                        lastShortcutAction.actionKey === actionKey;
                    
                     return (
                        <li 
                          key={player.id} 
                          className={`${playerListItemBaseClass} flex flex-col ${isLeadingScorer ? playerListLeadingScorerClass : playerListNormalClass} ${!isDisabled && !isEffectivelyFouledOut ? playerListHoverClass : ''}`}
                        >
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <div className="flex items-center flex-grow min-w-0">
                                <div className={`truncate text-sm sm:text-base mr-2 ${isEffectivelyFouledOut ? 'text-red-500 line-through' : 'text-gray-800 dark:text-white'}`}>
                                    {isLeadingScorer && <span className="text-yellow-600 dark:text-yellow-400 font-bold">★ </span>}
                                    {player.number && `#${player.number} `}{player.name}
                                </div>
                                {!isEffectivelyFouledOut && (
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded" title={`Puntos: ${playerPoints}`}>{playerPoints}</span>
                                        <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded" title={`Rebotes: ${playerRebounds}`}>{playerRebounds}</span>
                                        <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded" title={`Asistencias: ${playerAssists}`}>{playerAssists}</span>
                                        <span className="bg-cyan-600 text-white text-xs px-1.5 py-0.5 rounded" title={`Robos: ${playerSteals}`}>{playerSteals}</span>
                                        <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded" title={`Bloqueos: ${playerBlocks}`}>{playerBlocks}</span>
                                        <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded" title={`Faltas Personales: ${playerFouls}`}>{playerFouls}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                              onClick={() => openStatsModal(player, activeTab)} 
                              disabled={isDisabled} 
                              className="p-1 text-gray-500 hover:text-gray-600 dark:text-brand-button dark:hover:bg-brand-button-hover rounded-md disabled:opacity-50 ml-2 flex-shrink-0"
                              aria-label={`Estadísticas completas para ${player.name}`}
                            >
                              <StatsChartIcon className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 w-full">
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_1_MADE, 'plus1', 1)} disabled={isDisabled} className={`${newShortcutButtonClass} bg-green-500 hover:bg-green-400 focus:ring-green-300 ${checkHighlight('plus1') ? highlightedButtonClass : ''}`} aria-label="+1 Punto (TL)">+1</button>
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_2_MADE, 'plus2', 2)} disabled={isDisabled} className={`${newShortcutButtonClass} bg-green-600 hover:bg-green-500 focus:ring-green-400 ${checkHighlight('plus2') ? highlightedButtonClass : ''}`} aria-label="+2 Puntos">+2</button>
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.POINTS_3_MADE, 'plus3', 3)} disabled={isDisabled} className={`${newShortcutButtonClass} bg-green-700 hover:bg-green-600 focus:ring-green-500 ${checkHighlight('plus3') ? highlightedButtonClass : ''}`} aria-label="+3 Puntos">+3</button>
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.REBOUNDS_DEFENSIVE, 'rebound')} disabled={isDisabled} className={`${newShortcutButtonClass} bg-orange-500 hover:bg-orange-400 focus:ring-orange-300 ${checkHighlight('rebound') ? highlightedButtonClass : ''}`} aria-label="Rebote Defensivo">R</button>
                            
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.ASSISTS, 'assist')} disabled={isDisabled} className={`${newShortcutButtonClass} bg-purple-600 hover:bg-purple-500 focus:ring-purple-400 ${checkHighlight('assist') ? highlightedButtonClass : ''}`} aria-label="Asistencia">A</button>
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.STEALS, 'steal')} disabled={isDisabled} className={`${newShortcutButtonClass} bg-cyan-600 hover:bg-cyan-500 focus:ring-cyan-400 ${checkHighlight('steal') ? highlightedButtonClass : ''}`} aria-label="Robo">S</button>
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.BLOCKS, 'block')} disabled={isDisabled} className={`${newShortcutButtonClass} bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-400 ${checkHighlight('block') ? highlightedButtonClass : ''}`} aria-label="Bloqueo">BLK</button>
                            <button onClick={() => handleShortcutStatClick(player, activeTab, StatType.FOULS_PERSONAL, 'foul')} disabled={isDisabled} className={`${newShortcutButtonClass} bg-red-600 hover:bg-red-500 focus:ring-red-400 ${checkHighlight('foul') ? highlightedButtonClass : ''}`} aria-label="Falta Personal">PF</button>
                          </div>
                          
                          {isEffectivelyFouledOut && (
                            <p className="text-xs text-red-600 dark:text-red-500 text-center mt-1.5 font-semibold">EXPULSADO</p>
                          )}
                        </li>);
                  })}
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Banca ({currentTeamDisplay.bench.length} / Total: {currentTeamDisplay.players.length})</h4>
                {currentTeamDisplay.bench.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">Banca vacía.</p>}
                <ul className="space-y-2">{currentTeamDisplay.bench.map(player => (<li key={player.id} className={`${playerListItemBaseClass} ${playerListNormalClass} ${playerListHoverClass} flex items-center justify-between`}><span className="text-gray-800 dark:text-white truncate">#{player.number} {player.name}</span></li>))}</ul>
              </div>

              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 pt-3 border-t border-gray-200 dark:border-slate-600">
                <button onClick={() => openSubModal(activeTab)} disabled={gameData.gamePhase === GamePhase.FINISHED} className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm disabled:opacity-50">Sustitución</button>
                <button onClick={() => openAddPlayerFromRosterModal(activeTab)} disabled={gameData.gamePhase === GamePhase.FINISHED} className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm disabled:opacity-50 flex items-center justify-center"><PlusIcon className="w-4 h-4 mr-1" /> Añadir Jugador (Plantilla)</button>
              </div>
            </div>
          </div>
          
          {gameData.gamePhase !== GamePhase.FINISHED && <button onClick={() => setShowConfirmEndGame(true)} className="w-full mt-6 py-3 px-6 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Finalizar Partido</button>}
          {gameData.gamePhase === GamePhase.FINISHED && <Link to="/history" className="block w-full mt-6 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white text-center font-bold rounded-lg shadow-lg transition-colors">Ver Historial de Partidos</Link>}
        </div>
      </div>
      
      <div className="mt-6 bg-white dark:bg-brand-surface dark:shadow-slate-800/50 shadow-lg rounded-lg py-4">
        <div className="px-4"> {/* Inner padding for content, no mx-auto */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setIsPlayByPlayExpanded(prev => !prev)}
                        className="flex items-center py-2 px-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md text-gray-700 dark:text-white font-medium focus:outline-none"
                        aria-expanded={isPlayByPlayExpanded}
                        aria-controls="play-by-play-log"
                    >
                        <span>Play-by-Play ({gameData.gameLog.length} acciones)</span>
                        {isPlayByPlayExpanded ? <ChevronUpIcon className="w-5 h-5 ml-2" /> : <ChevronDownIcon className="w-5 h-5 ml-2" />}
                    </button>
                    
                    {gameData.gameLog.length > 0 && (
                      <button
                          onClick={handleExportPlayByPlayCSV}
                          className="flex items-center justify-center px-2 sm:px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                          aria-label="Exportar Play-by-Play (CSV)"
                      >
                          <ExportIcon className="w-4 h-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">Exportar CSV</span>
                      </button>
                    )}
                    <button
                        onClick={handleUndoLastAction}
                        disabled={gameData.gameLog.length === 0 || gameData.gamePhase === GamePhase.FINISHED}
                        className="flex items-center justify-center px-2 sm:px-3 py-1.5 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 disabled:opacity-50"
                        aria-label="Deshacer última acción"
                    >
                        <ArrowUturnLeftIcon className="w-4 h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Deshacer</span>
                    </button>
                </div>
                <div></div> {/* Placeholder for right-aligned content if needed */}
            </div>

            {isPlayByPlayExpanded && (
              <div id="play-by-play-log" className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {gameData.gameLog.slice().reverse().map((action) => ( 
                  <div key={action.id} className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-md text-sm transition-colors">
                  <div className="flex justify-between items-start">
                      <div className="flex-grow">
                      <span className="font-semibold text-gray-600 dark:text-slate-300 mr-2">
                          {formatActionTime(action, gameData.settings, gameData.startTime)}
                      </span>
                      <span className="text-gray-700 dark:text-slate-300">{action.description}</span>
                      </div>
                  </div>
                  </div>
              ))}
              {gameData.gameLog.length === 0 && <p className="text-gray-500 dark:text-slate-400 text-center py-2">No hay acciones registradas aún.</p>}
              </div>
            )}
        </div>
      </div>

      {isStatsModalOpen && playerForStats && teamForStatsModal && gameData && ( <PlayerStatsModal isOpen={isStatsModalOpen} onClose={handleCloseStatsModal} player={playerForStats} teamType={teamForStatsModal} currentStats={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam'].stats[playerForStats.id] || initialPlayerStats} onSaveStats={handleStatUpdate} maxPersonalFouls={gameData.settings.maxPersonalFouls} allowFoulOuts={gameData.settings.allowFoulOuts} /> )}
      {isSubModalOpen && teamForStatsModal && gameData && (<SubstitutionModal isOpen={isSubModalOpen} onClose={handleCloseSubModal} team={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam']} teamType={teamForStatsModal} onConfirmSubstitution={handleSubstitution} />)}
      <ConfirmDialog isOpen={showConfirmEndGame} onClose={handleConfirmEndGameDialog} onConfirm={handleEndGameConfirm} title="Confirmar Finalización" confirmText="Sí, finalizar">¿Estás seguro de que quieres finalizar este partido? No podrás realizar más cambios.</ConfirmDialog>
      <AlertDialog isOpen={alertInfo.isOpen} onClose={handleCloseAlert} title={alertInfo.title}>{alertInfo.message}</AlertDialog>
      {teamToAddTo && gameData && (<AddPlayerToGameTeamModal isOpen={isAddPlayerModalOpen} onClose={handleCloseAddPlayerModal} teamType={teamToAddTo} currentTeamName={teamToAddTo === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name} playersAlreadyInGameTeam={teamToAddTo === 'home' ? gameData.homeTeam.players : gameData.awayTeam.players} globalRoster={roster} onAddPlayers={handleAddPlayersFromRosterToGameTeam} unavailablePlayerIds={teamToAddTo === 'home' ? gameData.awayTeam.players.map(p=>p.id) : gameData.homeTeam.players.map(p=>p.id)} />)}
    </>
  );
});

export default GamePage;