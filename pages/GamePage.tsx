import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Game, Player, GamePhase, TeamType, StatType, PlayerStats, TeamGameInfo, initialPlayerStats, GameSettings } from '../types';
import TimerDisplay from '../components/TimerDisplay';
import TeamDisplay from '../components/TeamDisplay';
import PlayerStatsModal from '../components/PlayerStatsModal';
import SubstitutionModal from '../components/SubstitutionModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';
import AddPlayerToGameTeamModal from '../components/AddPlayerToGameTeamModal'; // Import new modal
import { UndoIcon, PlusIcon, SparklesIcon, StarIcon } from '../utils';

interface GamePageProps {
  gameData: Game | null;
  setGameData: React.Dispatch<React.SetStateAction<Game | null>>;
  onGameEnd: (game: Game) => void;
  roster: Player[]; // Full global roster
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
  const [statsModalOpenMode, setStatsModalOpenMode] = useState<'auto' | 'persistent'>('auto');
  const [playerForStats, setPlayerForStats] = useState<Player | null>(null);
  const [teamForStatsModal, setTeamForStatsModal] = useState<TeamType | null>(null);
  
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [showConfirmEndGame, setShowConfirmEndGame] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [teamToAddTo, setTeamToAddTo] = useState<TeamType | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const LONG_PRESS_DURATION = 1000; // 1 second

  useEffect(() => {
    if (!gameData) {
      navigate('/setup');
    }
    // Clear any active long press timer on component unmount
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [gameData, navigate]);

  const updateTeamData = useCallback((teamType: TeamType, newTeamData: Partial<TeamGameInfo>) => {
    setGameData(prevGame => {
      if (!prevGame) return null;
      const updatedTeamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
      const currentTeamData = prevGame[updatedTeamKey];
      const updatedTeam = { ...currentTeamData, ...newTeamData };
      
      let newScore = 0;
      if (updatedTeam.stats) {
        Object.values(updatedTeam.stats).forEach(playerStat => {
          newScore += calculatePlayerPoints(playerStat as PlayerStats);
        });
      }
      updatedTeam.score = newScore;

      return {
        ...prevGame,
        [updatedTeamKey]: updatedTeam,
      };
    });
  }, [setGameData]);


  const handleStatUpdate = useCallback((playerId: string, teamType: TeamType, updatedStats: PlayerStats) => {
    if (!gameData) return;
    
    const teamToUpdateKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
    const teamToUpdate = gameData[teamToUpdateKey];
    const newTeamStats = { ...teamToUpdate.stats, [playerId]: updatedStats };
    
    const oldFouls = teamToUpdate.stats[playerId]?.[StatType.FOULS_PERSONAL] || 0;
    const newFouls = updatedStats[StatType.FOULS_PERSONAL] || 0;
    let newTeamFoulsThisQuarter = teamToUpdate.foulsThisQuarter;
    if (newFouls > oldFouls) {
        newTeamFoulsThisQuarter += (newFouls - oldFouls);
    }

    updateTeamData(teamType, { stats: newTeamStats, foulsThisQuarter: newTeamFoulsThisQuarter });
  }, [gameData, updateTeamData]);


  const handleSubstitution = useCallback((teamType: TeamType, playerIn: Player, playerOut: Player) => {
    if (!gameData) return;
    const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
    const currentTeam = gameData[teamKey];

    const newOnCourt = currentTeam.onCourt.filter(p => p.id !== playerOut.id).concat(playerIn);
    const newBench = currentTeam.bench.filter(p => p.id !== playerIn.id).concat(playerOut);

    updateTeamData(teamType, { onCourt: newOnCourt, bench: newBench });
  }, [gameData, updateTeamData]);

  const handleAddPlayersFromRosterToGameTeam = useCallback((teamType: TeamType, playersToAdd: Player[]) => {
    if (!gameData) return;

    setGameData(prevGame => {
      if (!prevGame) return null;
      const teamKey = teamType === 'home' ? 'homeTeam' : 'awayTeam';
      const currentTeam = prevGame[teamKey];

      const newTeamPlayersList = [...currentTeam.players];
      const newBenchList = [...currentTeam.bench];
      const newStats = { ...currentTeam.stats };

      playersToAdd.forEach(player => {
        if (!newTeamPlayersList.find(p => p.id === player.id)) { 
          newTeamPlayersList.push(player);
          newBenchList.push(player); 
          newStats[player.id] = { ...initialPlayerStats };
        }
      });
      
      return {
        ...prevGame,
        [teamKey]: {
          ...currentTeam,
          players: newTeamPlayersList,
          bench: newBenchList,
          stats: newStats,
        }
      };
    });
    setIsAddPlayerModalOpen(false);
    setTeamToAddTo(null);
  }, [gameData, setGameData]);
  
  const openStatsModalWithMode = (player: Player, teamType: TeamType, mode: 'auto' | 'persistent') => {
    if (gameData?.gamePhase !== GamePhase.IN_PROGRESS && gameData?.gamePhase !== GamePhase.TIMEOUT) {
        setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Solo se pueden registrar estadísticas durante el juego activo o tiempos muertos."});
        return;
    }
    setPlayerForStats(player);
    setTeamForStatsModal(teamType);
    setStatsModalOpenMode(mode);
    setIsStatsModalOpen(true);
  };

  const handleStatsButtonPressStart = (player: Player, teamType: TeamType) => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
        openStatsModalWithMode(player, teamType, 'persistent');
        longPressTimerRef.current = null; // Mark as handled
    }, LONG_PRESS_DURATION);
  };

  const handleStatsButtonPressEnd = (player: Player, teamType: TeamType) => {
    if (longPressTimerRef.current) { // If timer is still active, it means it wasn't a long press
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        openStatsModalWithMode(player, teamType, 'auto'); // Open in normal (auto) mode
    }
    // If longPressTimerRef.current is null, it means long press already fired and opened the modal.
  };


  const openSubModal = (teamType: TeamType) => {
    const allowedPhasesForSub = [
        GamePhase.IN_PROGRESS, GamePhase.TIMEOUT, GamePhase.QUARTER_BREAK, 
        GamePhase.HALFTIME, GamePhase.OVERTIME_BREAK, GamePhase.WARMUP, GamePhase.NOT_STARTED
    ];
    if (!gameData || !allowedPhasesForSub.includes(gameData.gamePhase)) {
        setAlertInfo({isOpen: true, title: "Acción no permitida", message: "Las sustituciones solo se pueden hacer durante el juego, tiempos muertos, calentamiento o descansos."});
        return;
    }
    setTeamForStatsModal(teamType);
    setIsSubModalOpen(true);
  };

  const openAddPlayerFromRosterModal = (teamType: TeamType) => {
    if (gameData?.gamePhase === GamePhase.FINISHED) {
      setAlertInfo({isOpen: true, title: "Partido Finalizado", message: "No se pueden añadir jugadores a un partido finalizado."});
      return;
    }
    setTeamToAddTo(teamType);
    setIsAddPlayerModalOpen(true);
  };

  // Timer Control Handlers (unchanged from previous state, ensure they are correct)
  const handleStartTimer = useCallback(() => {
    setGameData(prev => {
      if (!prev || prev.gamePhase === GamePhase.FINISHED) return prev;
      let newPhase = prev.gamePhase;
      let newTime = prev.currentTimeRemainingInPhase;
      let newQuarter = prev.currentQuarter;
      let newIsOvertime = prev.isOvertime;

      if (newPhase === GamePhase.NOT_STARTED || newPhase === GamePhase.WARMUP) {
        newPhase = GamePhase.IN_PROGRESS;
        newQuarter = 1;
        newIsOvertime = false;
        newTime = prev.settings.quarterDuration;
      } else if (newPhase === GamePhase.TIMEOUT) {
        newPhase = GamePhase.IN_PROGRESS; 
      } else if (newPhase === GamePhase.QUARTER_BREAK || newPhase === GamePhase.HALFTIME || newPhase === GamePhase.OVERTIME_BREAK) {
        if (newTime <= 0) { 
            newPhase = GamePhase.IN_PROGRESS;
            newTime = newIsOvertime ? prev.settings.overtimeDuration : prev.settings.quarterDuration;
        }
      }
      return { 
        ...prev, 
        timerIsRunning: true, 
        lastTickTimestamp: Date.now(),
        gamePhase: newPhase,
        currentTimeRemainingInPhase: newTime,
        currentQuarter: newQuarter,
        isOvertime: newIsOvertime,
        startTime: prev.startTime || (newPhase === GamePhase.IN_PROGRESS && newQuarter === 1 && !newIsOvertime ? new Date().toISOString() : null),
      };
    });
  }, [setGameData]);

  const handlePauseTimer = useCallback(() => {
    setGameData(prev => {
      if (!prev || !prev.timerIsRunning) return prev;
      let newPhase = prev.gamePhase;
      if (newPhase === GamePhase.IN_PROGRESS) {
        newPhase = GamePhase.TIMEOUT;
      }
      return { ...prev, timerIsRunning: false, gamePhase: newPhase };
    });
  }, [setGameData]);

  const handleResetTimer = useCallback(() => {
    setGameData(prev => {
      if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning) return prev;
      let timeToResetTo = prev.currentTimeRemainingInPhase;
      switch(prev.gamePhase) {
        case GamePhase.IN_PROGRESS:
        case GamePhase.TIMEOUT:
          timeToResetTo = prev.isOvertime ? prev.settings.overtimeDuration : prev.settings.quarterDuration;
          break;
        case GamePhase.QUARTER_BREAK:
        case GamePhase.OVERTIME_BREAK:
          timeToResetTo = prev.settings.breakDuration || 60;
          break;
        case GamePhase.HALFTIME:
          timeToResetTo = (prev.settings.breakDuration || 60) * 2;
          break;
        case GamePhase.WARMUP:
           timeToResetTo = prev.settings.quarterDuration; 
           break;
      }
      return { ...prev, currentTimeRemainingInPhase: timeToResetTo, lastTickTimestamp: null };
    });
  }, [setGameData]);

  const handleGoToNextPeriod = useCallback(() => {
    setGameData(prev => {
        if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning) return prev;
        
        let newQuarter = prev.currentQuarter;
        let newIsOvertime = prev.isOvertime;
        let newTime = 0;
        let newPhase = GamePhase.IN_PROGRESS;

        if (!newIsOvertime) {
            if (newQuarter < prev.settings.quarters) {
                newQuarter++;
                newTime = prev.settings.quarterDuration;
            } else { 
                newIsOvertime = true;
                newQuarter++; 
                newTime = prev.settings.overtimeDuration;
            }
        } else { 
            newQuarter++;
            newTime = prev.settings.overtimeDuration;
        }
        
        return {
            ...prev,
            currentQuarter: newQuarter,
            isOvertime: newIsOvertime,
            gamePhase: newPhase,
            currentTimeRemainingInPhase: newTime,
            timerIsRunning: false, 
            lastTickTimestamp: null,
            homeTeam: { ...prev.homeTeam, foulsThisQuarter: 0 },
            awayTeam: { ...prev.awayTeam, foulsThisQuarter: 0 },
        };
    });
  }, [setGameData]);

  const handleGoToPrevPeriod = useCallback(() => {
    setGameData(prev => {
        if (!prev || prev.gamePhase === GamePhase.FINISHED || prev.timerIsRunning) return prev;
        if (prev.currentQuarter === 1 && !prev.isOvertime) return prev; 

        let newQuarter = prev.currentQuarter;
        let newIsOvertime = prev.isOvertime;
        let newTime = 0;
        let newPhase = GamePhase.IN_PROGRESS;

        if (newIsOvertime) {
            if (newQuarter > prev.settings.quarters + 1) { 
                newQuarter--;
                newTime = prev.settings.overtimeDuration;
            } else { 
                newIsOvertime = false;
                newQuarter = prev.settings.quarters;
                newTime = prev.settings.quarterDuration;
            }
        } else { 
            newQuarter--;
            newTime = prev.settings.quarterDuration;
        }

        return {
            ...prev,
            currentQuarter: newQuarter,
            isOvertime: newIsOvertime,
            gamePhase: newPhase,
            currentTimeRemainingInPhase: newTime,
            timerIsRunning: false,
            lastTickTimestamp: null,
            homeTeam: { ...prev.homeTeam, foulsThisQuarter: 0 }, 
            awayTeam: { ...prev.awayTeam, foulsThisQuarter: 0 },
        };
    });
  }, [setGameData]);
  
  const handleEndGameConfirm = () => {
    if (gameData) {
      const finalGameData = { ...gameData, gamePhase: GamePhase.FINISHED, endTime: new Date().toISOString(), timerIsRunning: false, lastTickTimestamp: null };
      if (finalGameData.homeTeam.score > finalGameData.awayTeam.score) {
        finalGameData.winningTeam = 'home';
      } else if (finalGameData.awayTeam.score > finalGameData.homeTeam.score) {
        finalGameData.winningTeam = 'away';
      } else {
        finalGameData.winningTeam = 'tie';
      }
      onGameEnd(finalGameData);
      navigate('/history');
    }
    setShowConfirmEndGame(false);
  };
  
  const getLeadingScorers = (team: TeamGameInfo): string[] => {
    if (!team || !team.stats || Object.keys(team.stats).length === 0) return [];
    let maxPoints = 0;
    Object.values(team.stats).forEach(playerStat => {
        const points = calculatePlayerPoints(playerStat);
        if (points > maxPoints) {
            maxPoints = points;
        }
    });
    if (maxPoints === 0) return []; 

    return Object.keys(team.stats).filter(playerId => calculatePlayerPoints(team.stats[playerId]) === maxPoints);
  };

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl text-slate-300 mb-4">No hay datos del partido.</p>
        <Link to="/setup" className="px-6 py-3 bg-brand-accent text-white rounded-md hover:bg-opacity-90">
          Configurar Nuevo Partido
        </Link>
      </div>
    );
  }

  const currentTeamDisplay = activeTab === 'home' ? gameData.homeTeam : gameData.awayTeam;
  const leadingScorersForCurrentTeam = getLeadingScorers(currentTeamDisplay);

  return (
    <div className="space-y-4 md:space-y-6">
      <TimerDisplay
        gameData={gameData}
        onStartTimer={handleStartTimer}
        onPauseTimer={handlePauseTimer}
        onResetTimer={handleResetTimer}
        onGoToNextPeriod={handleGoToNextPeriod}
        onGoToPrevPeriod={handleGoToPrevPeriod}
      />

      <div className="grid grid-cols-2 gap-4">
        <TeamDisplay team={gameData.homeTeam} gameSettings={gameData.settings} />
        <TeamDisplay team={gameData.awayTeam} gameSettings={gameData.settings} />
      </div>

      <div className="bg-brand-surface rounded-lg shadow-md">
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-3 px-2 text-center font-medium ${activeTab === 'home' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-slate-400 hover:text-white'}`}
          >
            {gameData.homeTeam.name}
          </button>
          <button
            onClick={() => setActiveTab('away')}
            className={`flex-1 py-3 px-2 text-center font-medium ${activeTab === 'away' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-slate-400 hover:text-white'}`}
          >
            {gameData.awayTeam.name}
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">En Cancha ({currentTeamDisplay.onCourt.length})</h4>
            {currentTeamDisplay.onCourt.length === 0 && <p className="text-sm text-slate-400">Nadie en cancha.</p>}
            <ul className="space-y-2">
              {currentTeamDisplay.onCourt.map(player => {
                 const stats = currentTeamDisplay.stats[player.id] || initialPlayerStats;
                 const points = calculatePlayerPoints(stats);
                 const isEffectivelyFouledOut = gameData.settings.allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= gameData.settings.maxPersonalFouls;
                 const isLeadingScorer = leadingScorersForCurrentTeam.includes(player.id);

                 return (
                    <li key={player.id} className={`flex items-center justify-between p-2 rounded-md ${isLeadingScorer ? 'bg-amber-900/30 border-l-4 border-brand-accent' : 'bg-slate-700'} hover:bg-slate-600`}>
                      <div className={`flex-grow truncate ${isEffectivelyFouledOut ? 'text-red-500 line-through' : 'text-white'}`}>
                        {isLeadingScorer && <StarIcon className="w-4 h-4 inline mr-1 text-yellow-400" />}
                        #{player.number} {player.name} 
                        <span className="text-xs text-slate-400 ml-2">
                          {points} pts, {stats[StatType.FOULS_PERSONAL] || 0} PF
                        </span>
                      </div>
                      <button
                        onMouseDown={() => handleStatsButtonPressStart(player, activeTab)}
                        onMouseUp={() => handleStatsButtonPressEnd(player, activeTab)}
                        onTouchStart={() => handleStatsButtonPressStart(player, activeTab)}
                        onTouchEnd={() => handleStatsButtonPressEnd(player, activeTab)}
                        onMouseLeave={() => { // Clear timer if mouse leaves button during press
                            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                        }}
                        disabled={gameData.gamePhase === GamePhase.FINISHED || isEffectivelyFouledOut}
                        className="ml-2 px-3 py-1 text-xs bg-brand-button hover:bg-brand-button-hover text-white rounded disabled:opacity-50"
                        aria-label={`Estadísticas para ${player.name}`}
                      >
                        Stats
                      </button>
                    </li>
                 );
              })}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-2">Banca ({currentTeamDisplay.bench.length} / Total Equipo: {currentTeamDisplay.players.length})</h4>
            {currentTeamDisplay.bench.length === 0 && <p className="text-sm text-slate-400">Banca vacía.</p>}
            <ul className="space-y-2">
              {currentTeamDisplay.bench.map(player => (
                <li key={player.id} className="flex items-center justify-between p-2 bg-slate-700 rounded-md hover:bg-slate-600">
                  <span className="text-white truncate">#{player.number} {player.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 pt-3 border-t border-slate-600">
            <button 
                onClick={() => openSubModal(activeTab)}
                disabled={gameData.gamePhase === GamePhase.FINISHED}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm disabled:opacity-50"
            >
                Sustitución
            </button>
            <button
                onClick={() => openAddPlayerFromRosterModal(activeTab)}
                disabled={gameData.gamePhase === GamePhase.FINISHED}
                className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm disabled:opacity-50 flex items-center justify-center"
            >
               <PlusIcon className="w-4 h-4 mr-1" /> Añadir Jugador (Plantilla)
            </button>
          </div>
        </div>
      </div>
      
      {gameData.gamePhase !== GamePhase.FINISHED && (
        <button
          onClick={() => setShowConfirmEndGame(true)}
          className="w-full mt-6 py-3 px-6 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          Finalizar Partido
        </button>
      )}
       {gameData.gamePhase === GamePhase.FINISHED && (
         <Link 
            to="/history"
            className="block w-full mt-6 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white text-center font-bold rounded-lg shadow-lg transition-colors"
        >
            Ver Historial de Partidos
        </Link>
      )}

      {isStatsModalOpen && playerForStats && teamForStatsModal && gameData && (
        <PlayerStatsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          player={playerForStats}
          teamType={teamForStatsModal}
          currentStats={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam'].stats[playerForStats.id] || initialPlayerStats}
          onSaveStats={handleStatUpdate}
          maxPersonalFouls={gameData.settings.maxPersonalFouls}
          allowFoulOuts={gameData.settings.allowFoulOuts}
          openMode={statsModalOpenMode}
        />
      )}
      {isSubModalOpen && teamForStatsModal && (
        <SubstitutionModal
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          team={gameData[teamForStatsModal === 'home' ? 'homeTeam' : 'awayTeam']}
          teamType={teamForStatsModal}
          onConfirmSubstitution={handleSubstitution}
        />
      )}
      <ConfirmDialog
        isOpen={showConfirmEndGame}
        onClose={() => setShowConfirmEndGame(false)}
        onConfirm={handleEndGameConfirm}
        title="Confirmar Finalización"
        confirmText="Sí, finalizar"
      >
        ¿Estás seguro de que quieres finalizar este partido? No podrás realizar más cambios.
      </ConfirmDialog>
      <AlertDialog
        isOpen={alertInfo.isOpen}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
        title={alertInfo.title}
      >
        {alertInfo.message}
      </AlertDialog>
      {teamToAddTo && gameData && (
        <AddPlayerToGameTeamModal
            isOpen={isAddPlayerModalOpen}
            onClose={() => { setIsAddPlayerModalOpen(false); setTeamToAddTo(null); }}
            teamType={teamToAddTo}
            currentTeamName={teamToAddTo === 'home' ? gameData.homeTeam.name : gameData.awayTeam.name}
            playersAlreadyInGameTeam={teamToAddTo === 'home' ? gameData.homeTeam.players : gameData.awayTeam.players}
            globalRoster={roster}
            onAddPlayers={handleAddPlayersFromRosterToGameTeam}
            unavailablePlayerIds={teamToAddTo === 'home' ? gameData.awayTeam.players.map(p=>p.id) : gameData.homeTeam.players.map(p=>p.id)}
        />
      )}
    </div>
  );
};

export default GamePage;