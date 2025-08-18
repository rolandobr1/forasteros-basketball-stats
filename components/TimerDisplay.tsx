
import React, { useCallback } from 'react';
import { Game, GamePhase } from '../types'; 
import { formatTime, PlayIcon, PauseIcon, ArrowUturnLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '../utils';

interface TimerDisplayProps {
  gameData: Game;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onGoToNextPeriod: () => void;
  onGoToPrevPeriod: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = React.memo(({
    gameData, onStartTimer, onPauseTimer, onResetTimer, onGoToNextPeriod, onGoToPrevPeriod,
}) => {
  const { 
    settings, gamePhase, currentQuarter, isOvertime, 
    currentTimeRemainingInPhase, timerIsRunning 
  } = gameData;

  const handleStartPause = useCallback(() => {
    if (gamePhase === GamePhase.FINISHED) return; 
    if (timerIsRunning) onPauseTimer(); else onStartTimer();
  }, [gamePhase, timerIsRunning, onPauseTimer, onStartTimer]);
  
  const getPhaseDisplay = useCallback(() => {
    if (gamePhase === GamePhase.IN_PROGRESS) return isOvertime ? `Prórroga ${currentQuarter - settings.quarters}` : `Cuarto ${currentQuarter}`;
    if (gamePhase === GamePhase.QUARTER_BREAK) return `Descanso (Fin Q${currentQuarter -1 })`;
    if (gamePhase === GamePhase.HALFTIME) return "Medio Tiempo";
    if (gamePhase === GamePhase.OVERTIME_BREAK) return `Descanso Prórroga (Fin OT${currentQuarter - 1 - settings.quarters})`;
    if (gamePhase === GamePhase.TIMEOUT) return "Tiempo Muerto";
    if (gamePhase === GamePhase.WARMUP) return "Calentamiento";
    if (gamePhase === GamePhase.FINISHED) return "Finalizado";
    if (gamePhase === GamePhase.NOT_STARTED) return "No Iniciado";
    return gamePhase; 
  }, [gamePhase, currentQuarter, isOvertime, settings.quarters]);

  const getButtonLabel = useCallback(() => {
    if (timerIsRunning) {
        if ([GamePhase.IN_PROGRESS, GamePhase.WARMUP, GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK].includes(gamePhase)) return 'Pausar';
        return 'Pausar'; 
    }
    if ([GamePhase.WARMUP, GamePhase.NOT_STARTED].includes(gamePhase)) return 'Iniciar Partido';
    if ([GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK].includes(gamePhase)) return 'Reanudar Descanso'; 
    if ([GamePhase.TIMEOUT, GamePhase.IN_PROGRESS].includes(gamePhase)) return 'Continuar Juego';
    return 'Iniciar'; 
  }, [timerIsRunning, gamePhase]);

  const isStartButtonDisabled = gamePhase === GamePhase.FINISHED;
  const isResetButtonDisabled = gamePhase === GamePhase.FINISHED || timerIsRunning;
  const isPrevPeriodDisabled = gamePhase === GamePhase.FINISHED || timerIsRunning || (currentQuarter === 1 && !isOvertime && ![GamePhase.QUARTER_BREAK, GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK].includes(gamePhase) );
  const isNextPeriodDisabled = gamePhase === GamePhase.FINISHED || timerIsRunning;

  const timeColor = timerIsRunning 
    ? 'text-green-500 dark:text-green-400' 
    : (gamePhase === GamePhase.FINISHED 
        ? 'text-gray-400 dark:text-slate-500' 
        : 'text-red-500 dark:text-red-400');

  return (
    <div className="bg-white dark:bg-brand-surface p-4 rounded-lg shadow-md text-center space-y-3">
      <div className="text-sm text-gray-600 dark:text-slate-300 font-medium">{getPhaseDisplay()}</div>
      <div className={`text-6xl font-mono font-bold ${timeColor}`}>
        {formatTime(Math.max(0,currentTimeRemainingInPhase))}
      </div>
      <div className="flex justify-center space-x-3">
        <button
          onClick={handleStartPause}
          disabled={isStartButtonDisabled}
          className={`px-4 py-2 rounded-md text-white font-semibold flex items-center space-x-2
            ${timerIsRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {timerIsRunning ? <PauseIcon /> : <PlayIcon />}
          <span>{getButtonLabel()}</span>
        </button>
        <button
          onClick={onResetTimer}
          disabled={isResetButtonDisabled}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-brand-button dark:hover:bg-brand-button-hover text-white rounded-md font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUturnLeftIcon />
          <span>Reset Tiempo</span>
        </button>
      </div>
      <div className="flex justify-center space-x-3 pt-2 border-t border-gray-200 dark:border-slate-700 mt-3">
        <button onClick={onGoToPrevPeriod} disabled={isPrevPeriodDisabled}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Periodo Anterior">
            <ChevronLeftIcon /> <span>Periodo Ant.</span>
        </button>
        <button onClick={onGoToNextPeriod} disabled={isNextPeriodDisabled}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Siguiente Periodo">
            <span>Periodo Sig.</span> <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
});

export default TimerDisplay;
