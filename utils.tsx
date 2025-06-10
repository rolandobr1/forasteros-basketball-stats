
import React from 'react';
import { PiBasketball, PiSignOutBold, PiQuestion, PiSunDimBold, PiMoonStarsBold } from 'react-icons/pi'; // Import the new icon
import { FaRegTrashAlt, FaExchangeAlt } from 'react-icons/fa'; // Import FaRegTrashAlt and FaExchangeAlt
import { GiBasketballBasket } from 'react-icons/gi'; // Added for LiveGameIcon
import { IoStatsChart } from "react-icons/io5"; // Added for StatsChartIcon
import { GoStarFill } from "react-icons/go"; // Added for GoStarFillIcon
import { VscDebugRestart } from "react-icons/vsc"; // Added for RestartIcon
import { Game, GamePhase, GameSettings, TeamGameInfo } from './types'; // Added Game, GamePhase, GameSettings for gameLogic

// Formats time in seconds to MM:SS
export const formatTime = (totalSeconds: number): string => {
  // Floor the total seconds to display whole seconds, typical for countdowns
  const flooredTotalSeconds = Math.floor(totalSeconds);

  // Calculate total minutes, allowing them to exceed 59 if totalSeconds is >= 3600
  const totalMinutes = Math.floor(flooredTotalSeconds / 60);
  const seconds = flooredTotalSeconds % 60;

  const formattedMinutes = String(totalMinutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
};

// --- Game Logic Utility ---
const isPhaseWithActiveTimer = (phase: GamePhase): boolean => {
  return [
    GamePhase.IN_PROGRESS,
    GamePhase.WARMUP,
    GamePhase.QUARTER_BREAK,
    GamePhase.HALFTIME,
    GamePhase.OVERTIME_BREAK,
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
  } = { ...currentGame }; // Work with a copy

  if (!isPhaseWithActiveTimer(gamePhase) || !currentGame.timerIsRunning) {
    // If timer isn't supposed to be running for this phase or explicitly paused,
    // return current state but ensure lastTickTimestamp might be updated by caller.
    return currentGame;
  }

  currentTimeRemainingInPhase -= elapsedSeconds;

  if (!startTime && gamePhase === GamePhase.WARMUP && currentTimeRemainingInPhase < settings.quarterDuration) {
    startTime = new Date().toISOString();
  }

  let needsFoulReset = false;

  while (currentTimeRemainingInPhase <= 0) {
    const timeOverShot = Math.abs(currentTimeRemainingInPhase);

    if (gamePhase === GamePhase.WARMUP) {
      gamePhase = GamePhase.IN_PROGRESS;
      currentQuarter = 1;
      isOvertime = false;
      currentTimeRemainingInPhase = settings.quarterDuration;
      needsFoulReset = true;
      if (!startTime) startTime = new Date().toISOString();
    } else if (gamePhase === GamePhase.IN_PROGRESS) {
      if (!isOvertime) { // Regulation period ended
        if (currentQuarter < settings.quarters) {
          gamePhase = (currentQuarter === Math.floor(settings.quarters / 2)) ? GamePhase.HALFTIME : GamePhase.QUARTER_BREAK;
          const breakDur = settings.breakDuration || 60;
          currentTimeRemainingInPhase = (gamePhase === GamePhase.HALFTIME) ? breakDur * 2 : breakDur;
          currentQuarter++; // Advance to prepare for the quarter *after* this break
          needsFoulReset = true;
        } else { // End of Q4 (or last regulation quarter)
          gamePhase = GamePhase.OVERTIME_BREAK; 
          currentTimeRemainingInPhase = settings.breakDuration || 60;
          needsFoulReset = true; 
        }
      } else { // Overtime period ended
        gamePhase = GamePhase.OVERTIME_BREAK;
        currentTimeRemainingInPhase = settings.breakDuration || 60;
        currentQuarter++; 
        needsFoulReset = true;
      }
    } else if (gamePhase === GamePhase.QUARTER_BREAK || gamePhase === GamePhase.HALFTIME || gamePhase === GamePhase.OVERTIME_BREAK) {
      gamePhase = GamePhase.IN_PROGRESS;
      currentTimeRemainingInPhase = isOvertime ? settings.overtimeDuration : settings.quarterDuration;
    } else {
      currentTimeRemainingInPhase = 0; 
      break; 
    }
    currentTimeRemainingInPhase -= timeOverShot; 
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
  };
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
  <PiSunDimBold {...props} />
);

export const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <PiMoonStarsBold {...props} />
);