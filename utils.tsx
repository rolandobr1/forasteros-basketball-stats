
import React from 'react';
import { PiBasketball, PiSignOutBold, PiQuestion, PiSun, PiMoon, PiExportBold } from 'react-icons/pi'; // Import Sun and Moon icons
import { FaRegTrashAlt, FaExchangeAlt } from 'react-icons/fa';
import { GiBasketballBasket } from 'react-icons/gi';
import { IoStatsChart } from "react-icons/io5";
import { GoStarFill } from "react-icons/go";
import { VscDebugRestart } from "react-icons/vsc";
import { LuImport } from "react-icons/lu";
import { HiOutlineUserPlus } from "react-icons/hi2"; // Added import for new icon
import { Game, GamePhase, GameSettings, TeamGameInfo, GameAction, initialPlayerStats, PlayerStats, StatType, TeamType, ScoreUpdatePayload, FoulUpdatePayload, StatUpdatePayload, Player, SubstitutionPayload, TimerChangePayload, PlayerAddedToTeamPayload } from './types';
// Removed: import { EditIcon as EditIconSvg } from './utils'; 

// Formats time in seconds to MM:SS
export const formatTime = (totalSeconds: number): string => {
  const flooredTotalSeconds = Math.floor(totalSeconds);
  const totalMinutes = Math.floor(flooredTotalSeconds / 60);
  const seconds = flooredTotalSeconds % 60;
  const formattedMinutes = String(totalMinutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
};

// --- Game Logic Utility ---

// This internal helper determines if the game logic in advanceGameTime should actively decrement time.
// It's different from App.tsx's isPhaseWithRunningTimer which controls the setInterval.
const shouldAdvanceTimeInPhase = (phase: GamePhase): boolean => {
  return [
    GamePhase.IN_PROGRESS,
    GamePhase.WARMUP,
  ].includes(phase);
};

export const advanceGameTime = (currentGame: Game, elapsedSeconds: number): Game => {
  let {
    currentTimeRemainingInPhase,
    gamePhase,
    currentQuarter,
    isOvertime,
    settings,
    homeTeam,
    awayTeam,
    startTime,
    gameLog,
    timerIsRunning // Capture current timerIsRunning state
  } = { ...currentGame };

  // If the game phase isn't one where time actively runs, or if the timer is explicitly paused, do nothing.
  if (!shouldAdvanceTimeInPhase(gamePhase) || !timerIsRunning) {
    return currentGame;
  }

  currentTimeRemainingInPhase -= elapsedSeconds;

  let needsFoulReset = false;
  const newLogEntries: GameAction[] = [];
  const currentHomeScore = homeTeam.score;
  const currentAwayScore = awayTeam.score;

  // This loop primarily handles a single period transition when time runs out.
  // It also ensures that if timerIsRunning was true, but a period ends, timerIsRunning becomes false.
  while (currentTimeRemainingInPhase <= 0 && timerIsRunning) { 
    const timeOverShot = Math.abs(currentTimeRemainingInPhase);

    if (gamePhase === GamePhase.WARMUP) {
      gamePhase = GamePhase.IN_PROGRESS;
      currentQuarter = 1;
      isOvertime = false;
      currentTimeRemainingInPhase = settings.quarterDuration + timeOverShot; // Set to full duration of Q1
      needsFoulReset = true;
      if (!startTime) startTime = new Date().toISOString(); 
      newLogEntries.push({
        id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change',
        payload: { phase: GamePhase.WARMUP, action: 'period_advanced', oldQuarter: 0, newQuarter: currentQuarter, isOvertime, homeScoreAtAction: currentHomeScore, awayScoreAtAction: currentAwayScore } as TimerChangePayload,
        description: `Calentamiento finalizado. Listo para Cuarto ${currentQuarter}.`
      });
      timerIsRunning = false; // Pause timer, user starts Q1 manually
    } else if (gamePhase === GamePhase.IN_PROGRESS) {
      const prevQuarterForLog = currentQuarter;
      const prevIsOvertimeForLog = isOvertime;
      let logDescription = "";

      if (!isOvertime) { // Current period was regulation
        if (currentQuarter < settings.quarters) { // Not the last regulation quarter
          currentQuarter++;
          currentTimeRemainingInPhase = settings.quarterDuration + timeOverShot;
          logDescription = `Fin Cuarto ${prevQuarterForLog}. Listo para Cuarto ${currentQuarter}.`;
        } else { // End of regulation, prepare for overtime
          isOvertime = true;
          currentQuarter++; 
          currentTimeRemainingInPhase = settings.overtimeDuration + timeOverShot;
          logDescription = `Fin Cuarto ${prevQuarterForLog} (Reglamentario). Listo para Prórroga ${currentQuarter - settings.quarters}.`;
        }
      } else { // Current period was overtime
        currentQuarter++;
        currentTimeRemainingInPhase = settings.overtimeDuration + timeOverShot;
        logDescription = `Fin Prórroga ${prevQuarterForLog - settings.quarters}. Listo para Prórroga ${currentQuarter - settings.quarters}.`;
      }
      
      newLogEntries.push({
        id: crypto.randomUUID(), timestamp: Date.now(), type: 'timer_change',
        payload: { phase: GamePhase.IN_PROGRESS, action: 'period_advanced', oldQuarter: prevQuarterForLog, newQuarter: currentQuarter, isOvertime: isOvertime, homeScoreAtAction: currentHomeScore, awayScoreAtAction: currentAwayScore } as TimerChangePayload,
        description: logDescription
      });
      
      needsFoulReset = true;
      timerIsRunning = false; // Pause timer, user starts next period manually
    } else {
      // This case should ideally not be reached if timerIsRunning is true and phase is unhandled by shouldAdvanceTimeInPhase.
      // Break defensively.
      currentTimeRemainingInPhase = 0; 
      timerIsRunning = false; 
      break; 
    }

    // If timer was stopped by logic above, exit loop. currentTimeRemainingInPhase is now positive.
    if (!timerIsRunning) {
      break;
    }
  }

  if (needsFoulReset) {
    homeTeam = { ...homeTeam, foulsThisQuarter: 0 };
    awayTeam = { ...awayTeam, foulsThisQuarter: 0 };
  }

  return {
    ...currentGame,
    currentTimeRemainingInPhase,
    gamePhase,
    currentQuarter,
    isOvertime,
    homeTeam,
    awayTeam,
    startTime,
    timerIsRunning, // Reflects if the timer should be paused
    lastTickTimestamp: timerIsRunning ? (currentGame.lastTickTimestamp || Date.now()) : null, // Null if stopped
    gameLog: [...currentGame.gameLog, ...newLogEntries]
  };
};

export const formatActionTime = (action: GameAction, gameSettings: GameSettings, gameStartTime: string | null): string => {
  const payload = action.payload as Partial<ScoreUpdatePayload | FoulUpdatePayload | StatUpdatePayload | SubstitutionPayload | TimerChangePayload | PlayerAddedToTeamPayload>;
  
  let timeString = '';
  if (payload && typeof payload.quarter === 'number' && 'timeRemainingInPhase' in payload && typeof payload.timeRemainingInPhase === 'number') {
    const periodPrefix = payload.isOvertime ? `OT${payload.quarter - gameSettings.quarters}` : `Q${payload.quarter}`;
    timeString = `${periodPrefix} ${formatTime(payload.timeRemainingInPhase)}`;
  } else if (gameStartTime) {
    const gameStartMs = new Date(gameStartTime).getTime();
    const actionMs = action.timestamp;
    const diffSeconds = Math.max(0, Math.floor((actionMs - gameStartMs) / 1000));
    timeString = `~${formatTime(diffSeconds)}`; 
  } else {
    timeString = `TS: ${new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }

  let scoreString = '';
  if (payload && typeof payload.homeScoreAtAction === 'number' && typeof payload.awayScoreAtAction === 'number') {
    scoreString = ` (${payload.homeScoreAtAction} - ${payload.awayScoreAtAction})`;
  }

  return `${timeString}${scoreString}`;
};

export const recalculateGameStateFromLog = (
  initialSettings: GameSettings,
  initialHomePlayers: Player[],
  initialAwayPlayers: Player[],
  gameLog: GameAction[]
): { homeTeam: TeamGameInfo, awayTeam: TeamGameInfo } => {

  const createInitialTeamInfo = (name: string, players: Player[]): TeamGameInfo => ({
    name,
    players,
    onCourt: players.slice(0, 5), 
    bench: players.slice(5),      
    stats: players.reduce((acc, p) => ({ ...acc, [p.id]: { ...initialPlayerStats } }), {}),
    score: 0,
    foulsThisQuarter: 0, 
    timeoutsLeft: 5, 
  });

  let tempHomeTeam = createInitialTeamInfo("TempHome", initialHomePlayers);
  let tempAwayTeam = createInitialTeamInfo("TempAway", initialAwayPlayers);
  
  let currentLogQuarter = 1;
  let currentLogIsOvertime = false;

  for (const action of gameLog) {
    const payload = action.payload;
    let targetTeamToUpdate: TeamGameInfo | null = null;
    let commonPlayerId: string | null = null;

    if ('teamId' in payload && payload.teamId) {
        targetTeamToUpdate = payload.teamId === 'home' ? tempHomeTeam : tempAwayTeam;
    }
    if ('playerId' in payload && typeof payload.playerId === 'string') { 
        commonPlayerId = payload.playerId;
    }
    
    // Check if the action indicates a new period where fouls should reset
    if (action.type === 'timer_change' && payload && 'action' in payload && 
        (payload.action === 'period_advanced' || payload.action === 'period_reverted')) {
        const timerPayload = payload as TimerChangePayload;
        if (typeof timerPayload.newQuarter === 'number' && typeof timerPayload.isOvertime === 'boolean') {
             // Reset fouls if newQuarter or isOvertime status differs from current tracking,
             // but only if it's an advancement or the very first setup for Q1.
            if (timerPayload.newQuarter !== currentLogQuarter || timerPayload.isOvertime !== currentLogIsOvertime || 
                (timerPayload.action === 'period_advanced' && timerPayload.newQuarter === 1 && !timerPayload.isOvertime)) { // Added condition for Q1 start
                tempHomeTeam.foulsThisQuarter = 0;
                tempAwayTeam.foulsThisQuarter = 0;
                currentLogQuarter = timerPayload.newQuarter;
                currentLogIsOvertime = timerPayload.isOvertime;
            }
        }
    }


    switch (action.type) {
      case 'stat_update': {
        const statPayload = payload as StatUpdatePayload;
        if (targetTeamToUpdate && commonPlayerId && statPayload.statType) {
          if (!targetTeamToUpdate.stats[commonPlayerId]) targetTeamToUpdate.stats[commonPlayerId] = { ...initialPlayerStats };
          
          const numericValueChange = Number(statPayload.valueChange) || 0;
          targetTeamToUpdate.stats[commonPlayerId][statPayload.statType] = (targetTeamToUpdate.stats[commonPlayerId][statPayload.statType] || 0) + numericValueChange;
          
           if (numericValueChange < 0) { // Ensure consistency when reducing made shots
            if (statPayload.statType === StatType.POINTS_1_MADE && targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_1_ATTEMPTED] < targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_1_MADE]) {
                targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_1_ATTEMPTED] = targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_1_MADE];
            } else if (statPayload.statType === StatType.POINTS_2_MADE && targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_2_ATTEMPTED] < targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_2_MADE]) {
                targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_2_ATTEMPTED] = targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_2_MADE];
            } else if (statPayload.statType === StatType.POINTS_3_MADE && targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_3_ATTEMPTED] < targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_3_MADE]) {
                 targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_3_ATTEMPTED] = targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_3_MADE];
            }
          }
        }
        break;
      }
      case 'score_update': {
        const scorePayload = payload as ScoreUpdatePayload;
        if (targetTeamToUpdate) {
            const numericPointsScored = Number(scorePayload.pointsScored) || 0;
            targetTeamToUpdate.score += numericPointsScored;
            
            if (commonPlayerId && scorePayload.statType) {
                 if (!targetTeamToUpdate.stats[commonPlayerId]) targetTeamToUpdate.stats[commonPlayerId] = { ...initialPlayerStats };
                 // Increment/decrement the MADE stat itself
                 targetTeamToUpdate.stats[commonPlayerId][scorePayload.statType] = (targetTeamToUpdate.stats[commonPlayerId][scorePayload.statType] || 0) + (numericPointsScored > 0 ? 1 : (numericPointsScored < 0 ? -1 : 0)); 
                
                 // Also adjust ATTEMPTED stat if it's a MADE shot
                if (numericPointsScored !== 0) { 
                    if (scorePayload.statType === StatType.POINTS_1_MADE) targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_1_ATTEMPTED] = (targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_1_ATTEMPTED] || 0) + (numericPointsScored > 0 ? 1 : (numericPointsScored < 0 ? -1 : 0));
                    else if (scorePayload.statType === StatType.POINTS_2_MADE) targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_2_ATTEMPTED] = (targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_2_ATTEMPTED] || 0) + (numericPointsScored > 0 ? 1 : (numericPointsScored < 0 ? -1 : 0));
                    else if (scorePayload.statType === StatType.POINTS_3_MADE) targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_3_ATTEMPTED] = (targetTeamToUpdate.stats[commonPlayerId][StatType.POINTS_3_ATTEMPTED] || 0) + (numericPointsScored > 0 ? 1 : (numericPointsScored < 0 ? -1 : 0));
                }
            }
        }
        break;
      }
      case 'foul_update': {
        const foulPayload = payload as FoulUpdatePayload;
        if (targetTeamToUpdate && commonPlayerId) {
          if (!targetTeamToUpdate.stats[commonPlayerId]) targetTeamToUpdate.stats[commonPlayerId] = { ...initialPlayerStats };
          
          const numericFoulsAdded = Number(foulPayload.foulsAdded) || 0;
          targetTeamToUpdate.stats[commonPlayerId][StatType.FOULS_PERSONAL] = (targetTeamToUpdate.stats[commonPlayerId][StatType.FOULS_PERSONAL] || 0) + numericFoulsAdded;
          targetTeamToUpdate.foulsThisQuarter = (targetTeamToUpdate.foulsThisQuarter || 0) + numericFoulsAdded;
        }
        break;
      }
       case 'substitution': {
        const subPayload = payload as SubstitutionPayload;
        if (targetTeamToUpdate) {
          const playerIn = targetTeamToUpdate.players.find(p => p.id === subPayload.playerInId);
          const playerOut = targetTeamToUpdate.players.find(p => p.id === subPayload.playerOutId);

          if (playerIn && playerOut) {
            targetTeamToUpdate.onCourt = targetTeamToUpdate.onCourt.filter(p => p.id !== playerOut.id).concat(playerIn);
            targetTeamToUpdate.bench = targetTeamToUpdate.bench.filter(p => p.id !== playerIn.id).concat(playerOut);
          }
        }
        break;
      }
      case 'player_added_to_team': {
        const addPayload = payload as PlayerAddedToTeamPayload;
        if (targetTeamToUpdate && addPayload.playerId && addPayload.playerName) {
            const existingPlayer = targetTeamToUpdate.players.find(p => p.id === addPayload.playerId);
            if (!existingPlayer) {
                // Try to find the full player object from the initial lists (if it was an original player)
                const globalPlayer = (addPayload.teamId === 'home' ? initialHomePlayers : initialAwayPlayers).find(p => p.id === addPayload.playerId) 
                                  || { id: addPayload.playerId, name: addPayload.playerName, number: 'N/A', position: '' }; // Fallback

                targetTeamToUpdate.players.push(globalPlayer);
                targetTeamToUpdate.bench.push(globalPlayer); 
                targetTeamToUpdate.stats[addPayload.playerId] = { ...initialPlayerStats };
            }
        }
        break;
      }
      // No default case needed as we only modify state for known actions
    }
  }
  return { homeTeam: tempHomeTeam, awayTeam: tempAwayTeam };
};


// --- SVG Icons ---
export const BasketballIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiBasketball {...props} />
);

export const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
);

export const StartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);

export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L17.25 12l2.846.813a4.5 4.5 0 0 0 3.09 3.09L24 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L18.25 12Z" />
  </svg>
);

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

export const DeleteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <FaRegTrashAlt {...props} />
);

export const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const ChevronUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

export const ArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
  </svg>
);

export const ArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
  </svg>
);

export const UndoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const ArrowUturnLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);


export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

export const MinusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>
);

export const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
  </svg>
);

export const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518 .442c.479.038.673.724.317 1.02l-4.218 3.873a.563.563 0 0 0-.182.623l1.342 5.424c.072.292-.376.534-.638.372l-4.882-3.177a.563.563 0 0 0-.682 0l-4.882 3.177c-.261.162-.71.08-.638-.372l1.342-5.424a.563.563 0 0 0-.182-.623L.494 10.017c-.356-.296-.162-.982.317-1.02l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
  </svg>
);

export const GoStarFillIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <GoStarFill {...props} />
);

export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

export const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

export const EllipsisVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
  </svg>
);

export const SignOutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiSignOutBold {...props} />
);

export const QuestionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiQuestion {...props} />
);

export const LiveGameIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <GiBasketballBasket {...props} />
);

export const StatsChartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <IoStatsChart {...props} />
);

export const SwapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <FaExchangeAlt {...props} />
);

export const RestartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <VscDebugRestart {...props} />
);

export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const CircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiSun {...props} />
);

export const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiMoon {...props} />
);

export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.57M2.25 2.25l19.5 19.5" />
  </svg>
);

export const ImportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <LuImport {...props} />
);

export const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiExportBold {...props} />
);

export const AddUserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HiOutlineUserPlus {...props} />
);

// Removed ArrowDownTrayIcon as ExportIcon will be used.
// export const ArrowDownTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
//     <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
//   </svg>
// );
