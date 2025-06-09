
import React from 'react';
import { GameSettings, GamePhase, Game } from '../types';
import { formatTime, PlayIcon, PauseIcon, ArrowUturnLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '../utils';

interface TimerDisplayProps {
  gameData: Game; // Pass the whole game object
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onGoToNextPeriod: () => void;
  onGoToPrevPeriod: () => void;
  // onAdvancePeriodRequested is implicitly handled by timer logic now
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
    gameData,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
    onGoToNextPeriod,
    onGoToPrevPeriod,
}) => {
  const { 
    settings, 
    gamePhase, 
    currentQuarter, 
    isOvertime, 
    currentTimeRemainingInPhase, 
    timerIsRunning 
  } = gameData;

  const handleStartPause = () => {
    if (gamePhase === GamePhase.FINISHED) return;
    if (timerIsRunning) {
      onPauseTimer();
    } else {
      onStartTimer();
    }
  };
  
  const getPhaseDisplay = () => {
    if (gamePhase === GamePhase.IN_PROGRESS) {
      return isOvertime ? `Prórroga ${currentQuarter - settings.quarters}` : `Cuarto ${currentQuarter}`;
    }
    if (gamePhase === GamePhase.QUARTER_BREAK) return `Descanso (Fin Q${currentQuarter -1 })`; // Quarter already advanced
    if (gamePhase === GamePhase.HALFTIME) return "Medio Tiempo";
    if (gamePhase === GamePhase.OVERTIME_BREAK) return `Descanso Prórroga (Fin OT${currentQuarter - 1 - settings.quarters})`;
    if (gamePhase === GamePhase.TIMEOUT) return "Tiempo Muerto";
    if (gamePhase === GamePhase.WARMUP) return "Calentamiento";
    if (gamePhase === GamePhase.FINISHED) return "Finalizado";
    if (gamePhase === GamePhase.NOT_STARTED) return "No Iniciado";
    return gamePhase; 
  };

  const getButtonLabel = () => {
    if (timerIsRunning) {
        if (gamePhase === GamePhase.IN_PROGRESS || gamePhase === GamePhase.WARMUP || 
            gamePhase === GamePhase.QUARTER_BREAK || gamePhase === GamePhase.HALFTIME || gamePhase === GamePhase.OVERTIME_BREAK) return 'Pausar';
        return 'Pausar'; 
    }
    // Not running:
    if (gamePhase === GamePhase.WARMUP || gamePhase === GamePhase.NOT_STARTED) {
        return 'Iniciar Partido';
    }
    if (gamePhase === GamePhase.QUARTER_BREAK || gamePhase === GamePhase.HALFTIME || gamePhase === GamePhase.OVERTIME_BREAK) {
      return 'Reanudar Descanso'; 
    }
    if (gamePhase === GamePhase.TIMEOUT || gamePhase === GamePhase.IN_PROGRESS ) { // IN_PROGRESS but timer not running (e.g. just after period end)
        return 'Continuar Juego';
    }
    return 'Iniciar'; 
  };

  const isStartButtonDisabled = gamePhase === GamePhase.FINISHED;
  // Reset button should be available if timer is paused, or phase is suitable for reset (like timeout, or start of period)
  const isResetButtonDisabled = gamePhase === GamePhase.FINISHED || timerIsRunning;
  
  const isPrevPeriodDisabled = gamePhase === GamePhase.FINISHED || timerIsRunning || (currentQuarter === 1 && !isOvertime && gamePhase !== GamePhase.QUARTER_BREAK && gamePhase !== GamePhase.HALFTIME && gamePhase !== GamePhase.OVERTIME_BREAK );
  const isNextPeriodDisabled = gamePhase === GamePhase.FINISHED || timerIsRunning;


  return (
    <div className="bg-brand-surface p-4 rounded-lg shadow-md text-center space-y-3">
      <div className="text-sm text-slate-300 font-medium">{getPhaseDisplay()}</div>
      <div className={`text-6xl font-mono font-bold ${timerIsRunning ? 'text-green-400' : (gamePhase === GamePhase.FINISHED ? 'text-slate-500' : 'text-red-400')}`}>
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
          className="px-4 py-2 bg-brand-button hover:bg-brand-button-hover text-white rounded-md font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUturnLeftIcon />
          <span>Reset Tiempo</span>
        </button>
      </div>
      <div className="flex justify-center space-x-3 pt-2 border-t border-slate-700 mt-3">
        <button
            onClick={onGoToPrevPeriod}
            disabled={isPrevPeriodDisabled}
            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Periodo Anterior"
        >
            <ChevronLeftIcon />
            <span>Periodo Ant.</span>
        </button>
        <button
            onClick={onGoToNextPeriod}
            disabled={isNextPeriodDisabled}
            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Siguiente Periodo"
        >
            <span>Periodo Sig.</span>
            <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
};

export default TimerDisplay;
