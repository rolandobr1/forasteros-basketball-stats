
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Game, PlayerStats, StatType, Player, GameSettings, initialPlayerStats, GamePhase } from '../types'; // Added GamePhase
import { formatTime, DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, DeleteIcon } from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';
import { STAT_TYPE_LABELS } from '../constants';

interface HistoryPageProps {
  gameHistory: Game[];
  onDeleteGame: (gameId: string) => void;
}

// Helper to generate CSV content from game data
const generateCSV = (game: Game): string => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `Resumen del Partido - ${game.homeTeam.name} vs ${game.awayTeam.name}\n`;
  csvContent += `Fecha: ${game.startTime ? new Date(game.startTime).toLocaleDateString() : 'N/A'}\n`;
  csvContent += `Resultado Final: ${game.homeTeam.name} ${game.homeTeam.score} - ${game.awayTeam.name} ${game.awayTeam.score}\n\n`;

  const customHeaders = [
    "Jugador", "Equipo", "Número",
    STAT_TYPE_LABELS[StatType.POINTS_1_MADE], STAT_TYPE_LABELS[StatType.POINTS_1_ATTEMPTED],
    STAT_TYPE_LABELS[StatType.POINTS_2_MADE], STAT_TYPE_LABELS[StatType.POINTS_2_ATTEMPTED],
    STAT_TYPE_LABELS[StatType.POINTS_3_MADE], STAT_TYPE_LABELS[StatType.POINTS_3_ATTEMPTED],
    "Rebotes Totales",
    STAT_TYPE_LABELS[StatType.ASSISTS], STAT_TYPE_LABELS[StatType.STEALS],
    STAT_TYPE_LABELS[StatType.BLOCKS], STAT_TYPE_LABELS[StatType.TURNOVERS],
    STAT_TYPE_LABELS[StatType.FOULS_PERSONAL],
    "Total Puntos"
  ].join(',') + "\n";

  const safeNum = (val: any): number => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const playerToRow = (player: Player, teamName: string, playerStatsData: PlayerStats | undefined): string => {
    const statsSource = playerStatsData || initialPlayerStats;
    const pStats: PlayerStats = { ...initialPlayerStats }; 

    for (const key of Object.keys(initialPlayerStats)) {
      const statKey = key as StatType;
      if (Object.prototype.hasOwnProperty.call(statsSource, statKey)) {
        const rawValue = statsSource[statKey];
        pStats[statKey] = safeNum(rawValue);
      }
    }

    const points = safeNum(pStats[StatType.POINTS_1_MADE]) +
                   safeNum(pStats[StatType.POINTS_2_MADE]) * 2 +
                   safeNum(pStats[StatType.POINTS_3_MADE]) * 3;
    const totalRebounds = safeNum(pStats[StatType.REBOUNDS_OFFENSIVE]) + safeNum(pStats[StatType.REBOUNDS_DEFENSIVE]);
    const row = [
      player.name,
      teamName,
      player.number,
      pStats[StatType.POINTS_1_MADE], pStats[StatType.POINTS_1_ATTEMPTED],
      pStats[StatType.POINTS_2_MADE], pStats[StatType.POINTS_2_ATTEMPTED],
      pStats[StatType.POINTS_3_MADE], pStats[StatType.POINTS_3_ATTEMPTED],
      totalRebounds,
      pStats[StatType.ASSISTS],
      pStats[StatType.STEALS],
      pStats[StatType.BLOCKS],
      pStats[StatType.TURNOVERS],
      pStats[StatType.FOULS_PERSONAL],
      points
    ];
    return row.join(',') + "\n";
  };

  csvContent += `Estadísticas de ${game.homeTeam.name}\n`;
  csvContent += customHeaders;
  game.homeTeam.players.forEach(p => csvContent += playerToRow(p, game.homeTeam.name, game.homeTeam.stats[p.id]));

  csvContent += `\nEstadísticas de ${game.awayTeam.name}\n`;
  csvContent += customHeaders;
  game.awayTeam.players.forEach(p => csvContent += playerToRow(p, game.awayTeam.name, game.awayTeam.stats[p.id]));

  return csvContent;
};

// --- Per Quarter Score Calculation ---
interface QuarterScoreData {
  periodLabel: string;
  homeScore: number;
  awayScore: number;
}

interface ScoreUpdatePayload {
  teamId: 'home' | 'away';
  pointsScored: number; 
  quarter: number;
  isOvertime: boolean;
}

const calculatePerQuarterScores = (game: Game): QuarterScoreData[] => {
  const scoresByPeriodLabel = new Map<string, { home: number; away: number }>();
  const numRegulationQuarters = Number(game.settings.quarters); 

  game.gameLog.forEach(action => {
    if (action.type === 'score_update' && action.payload) {
      const payload = action.payload as Partial<ScoreUpdatePayload>;
      if (
        typeof payload.pointsScored === 'undefined' ||
        typeof payload.quarter !== 'number' ||
        typeof payload.isOvertime !== 'boolean' ||
        !payload.teamId ||
        (payload.teamId !== 'home' && payload.teamId !== 'away')
      ) {
        return;
      }

      const pointsScoredActual = Number(payload.pointsScored);
      if (isNaN(pointsScoredActual)) {
        console.warn("Invalid pointsScored in game log, cannot convert to number:", payload.pointsScored);
        return;
      }
      
      const mutablePayload = { ...payload }; 
      mutablePayload.pointsScored = pointsScoredActual;


      const { teamId, quarter: actionQuarterNumber, isOvertime: actionIsOvertime } = mutablePayload as ScoreUpdatePayload;
      
      const periodLabel = actionIsOvertime
        ? `OT${actionQuarterNumber - numRegulationQuarters}`
        : `Q${actionQuarterNumber}`;

      if (!scoresByPeriodLabel.has(periodLabel)) {
        scoresByPeriodLabel.set(periodLabel, { home: 0, away: 0 });
      }
      const currentPeriodScores = scoresByPeriodLabel.get(periodLabel)!;
      if (teamId === 'home') currentPeriodScores.home += pointsScoredActual;
      else if (teamId === 'away') currentPeriodScores.away += pointsScoredActual;
    }
  });

  const result: QuarterScoreData[] = [];
  const lastActiveAbsoluteQuarter = game.currentQuarter > 0 ? game.currentQuarter : (game.gameLog.length > 0 ? 1 : 0);

  for (let q = 1; q <= numRegulationQuarters; q++) {
    if (q > lastActiveAbsoluteQuarter && !game.isOvertime && game.gamePhase !== GamePhase.FINISHED) break;
    const periodLabel = `Q${q}`;
    const scoresForPeriod = scoresByPeriodLabel.get(periodLabel);
    result.push({
      periodLabel,
      homeScore: scoresForPeriod ? scoresForPeriod.home : 0,
      awayScore: scoresForPeriod ? scoresForPeriod.away : 0,
    });
  }

  if (game.isOvertime && lastActiveAbsoluteQuarter > numRegulationQuarters) {
    const numOvertimePeriodsPlayed = lastActiveAbsoluteQuarter - numRegulationQuarters;
    for (let otIndex = 1; otIndex <= numOvertimePeriodsPlayed; otIndex++) {
      const periodLabel = `OT${otIndex}`;
      const scoresForPeriod = scoresByPeriodLabel.get(periodLabel);
      result.push({
        periodLabel,
        homeScore: scoresForPeriod ? scoresForPeriod.home : 0,
        awayScore: scoresForPeriod ? scoresForPeriod.away : 0,
      });
    }
  }
  
  // If game is finished, ensure all periods up to the end are shown, even if scores are 0
  if (game.gamePhase === GamePhase.FINISHED) {
      const totalExpectedPeriods = game.isOvertime 
          ? numRegulationQuarters + (game.currentQuarter - numRegulationQuarters)
          : numRegulationQuarters;
      
      while(result.length < totalExpectedPeriods) {
          const nextPeriodIndex = result.length;
          let periodLabel;
          if (nextPeriodIndex < numRegulationQuarters) {
              periodLabel = `Q${nextPeriodIndex + 1}`;
          } else {
              periodLabel = `OT${nextPeriodIndex - numRegulationQuarters + 1}`;
          }
           if (!result.find(r => r.periodLabel === periodLabel)) {
             result.push({
                periodLabel,
                homeScore: scoresByPeriodLabel.get(periodLabel)?.home || 0,
                awayScore: scoresByPeriodLabel.get(periodLabel)?.away || 0,
            });
           } else { // Should not happen if logic is correct, but as a fallback
               break;
           }
      }
  }


  if (result.length > 0 && lastActiveAbsoluteQuarter > 0 && game.gamePhase !== GamePhase.FINISHED) {
    let lastNonZeroScorePeriodIndex = -1;
    for(let i = result.length - 1; i >=0; i--) {
      if(result[i].homeScore > 0 || result[i].awayScore > 0) {
        lastNonZeroScorePeriodIndex = i;
        break;
      }
    }
    // Determine max period to show based on game progression, not just scores
    let maxPeriodIndexToShow = game.isOvertime 
      ? (numRegulationQuarters -1) + (lastActiveAbsoluteQuarter - numRegulationQuarters) 
      : lastActiveAbsoluteQuarter - 1;
    
    // Ensure index is valid
    maxPeriodIndexToShow = Math.min(Math.max(0, maxPeriodIndexToShow), result.length -1);

    const finalIndexToShow = Math.max(lastNonZeroScorePeriodIndex, maxPeriodIndexToShow);

    if (finalIndexToShow < result.length -1 && finalIndexToShow >=0) {
        return result.slice(0, finalIndexToShow + 1);
    }
  }
  return result;
};


const GameCard: React.FC<{ game: Game, onDeleteGame: (gameId: string) => void }> = ({ game, onDeleteGame }) => {
  const [expanded, setExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const perQuarterScoresData = calculatePerQuarterScores(game);

  const longPressTimerRef = useRef<number | null>(null);
  const wasLongPressRef = useRef(false);
  const pressStartPointRef = useRef<{ x: number, y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const LONG_PRESS_DURATION = 700; // ms
  const MOVE_THRESHOLD = 10; // pixels

  const handlePressStart = useCallback((clientX: number, clientY: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    wasLongPressRef.current = false;
    pressStartPointRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true;
      setIsContextMenuOpen(true);
      setExpanded(false); // Close expanded view when context menu opens
    }, LONG_PRESS_DURATION);
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePressMove = useCallback((clientX: number, clientY: number) => {
    if (!pressStartPointRef.current || !longPressTimerRef.current) return;

    const deltaX = Math.abs(clientX - pressStartPointRef.current.x);
    const deltaY = Math.abs(clientY - pressStartPointRef.current.y);

    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      clearLongPressTimer();
      pressStartPointRef.current = null;
    }
  }, [clearLongPressTimer]);


  const handlePressEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  // Main click handler for the card
  const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent action if the click originated from within the context menu
    if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) {
      return;
    }
    
    if (wasLongPressRef.current) {
        wasLongPressRef.current = false; // Reset long press flag
        return; // Do not toggle expansion if it was a long press
    }

    if (isContextMenuOpen) {
        setIsContextMenuOpen(false); // Close context menu if open
        return; // Do not toggle expansion if context menu was just closed by this click
    }
    setExpanded(prev => !prev);
  };


  useEffect(() => {
    if (!isContextMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node) &&
        cardRef.current && !cardRef.current.contains(event.target as Node)
      ) {
            setIsContextMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isContextMenuOpen]);


  const handleExportCSV = () => {
    const csvData = generateCSV(game);
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `partido_${game.homeTeam.name}_vs_${game.awayTeam.name}_${game.id.substring(0,6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsContextMenuOpen(false); // Ensure context menu closes after action
  };

  const handleDeleteRequest = () => {
    setShowConfirmDelete(true);
    setIsContextMenuOpen(false); // Ensure context menu closes
  };

  const confirmDelete = () => {
    onDeleteGame(game.id);
    setShowConfirmDelete(false);
  };
  
  const safeNum = (val: any): number => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const renderPlayerStatsTable = (teamName: string, players: Player[], teamStats: Record<string, PlayerStats>) => (
    <div className="mt-2">
      <h4 className="text-md font-semibold text-slate-200 mb-1">{teamName}</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs bg-slate-700 rounded">
          <thead className="bg-slate-600">
            <tr>
              <th className="p-1 text-left">Jugador (#)</th>
              <th className="p-1 text-center">Pts</th><th className="p-1 text-center">Reb</th><th className="p-1 text-center">Ast</th>
              <th className="p-1 text-center">Stl</th><th className="p-1 text-center">Blk</th><th className="p-1 text-center">PF</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const statsSource = teamStats[p.id] || initialPlayerStats;
              const playerStats: PlayerStats = { ...initialPlayerStats };

              for (const key of Object.keys(initialPlayerStats)) {
                const statKey = key as StatType;
                if (Object.prototype.hasOwnProperty.call(statsSource, statKey)) {
                  const rawValue = statsSource[statKey];
                  playerStats[statKey] = safeNum(rawValue);
                }
              }

              const points =
                safeNum(playerStats[StatType.POINTS_1_MADE]) +
                safeNum(playerStats[StatType.POINTS_2_MADE]) * 2 +
                safeNum(playerStats[StatType.POINTS_3_MADE]) * 3;
              const rebounds = safeNum(playerStats[StatType.REBOUNDS_OFFENSIVE]) +
                               safeNum(playerStats[StatType.REBOUNDS_DEFENSIVE]);
              return (
                <tr key={p.id} className="border-b border-slate-600 last:border-b-0">
                  <td className="p-1">{p.name} ({p.number})</td>
                  <td className="p-1 text-center">{points}</td>
                  <td className="p-1 text-center">{rebounds}</td>
                  <td className="p-1 text-center">{safeNum(playerStats[StatType.ASSISTS])}</td>
                  <td className="p-1 text-center">{safeNum(playerStats[StatType.STEALS])}</td>
                  <td className="p-1 text-center">{safeNum(playerStats[StatType.BLOCKS])}</td>
                  <td className="p-1 text-center">{safeNum(Number(playerStats[StatType.FOULS_PERSONAL]))}</td>
                </tr>);
            })}
            {players.length === 0 && (<tr><td colSpan={7} className="p-2 text-center text-slate-400">Sin jugadores.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPerQuarterScoresTable = () => {
    if (perQuarterScoresData.length === 0) {
        return <p className="text-sm text-slate-400 mt-3 text-center">No hay datos de puntuación por periodo.</p>;
    }
    const periodLabels = perQuarterScoresData.map(item => item.periodLabel);

    return (
        <div className="mt-3">
            <h4 className="text-md font-semibold text-slate-200 mb-1">Puntuación por Periodo</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs bg-slate-700 rounded">
                    <thead className="bg-slate-600">
                        <tr>
                            <th className="p-1.5 text-left text-slate-200 sticky left-0 bg-slate-600 z-10 min-w-[100px] truncate">Equipo</th>
                            {periodLabels.map(label => (
                                <th key={label} className="p-1.5 text-center text-slate-200 min-w-[40px]">{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-600">
                            <td className="p-1.5 text-slate-300 sticky left-0 bg-slate-700 z-10 min-w-[100px] truncate" title={game.homeTeam.name}>{game.homeTeam.name}</td>
                            {periodLabels.map(label => {
                                const scoreItem = perQuarterScoresData.find(item => item.periodLabel === label);
                                return <td key={`${label}-home`} className="p-1.5 text-center text-slate-300">{scoreItem ? scoreItem.homeScore : '-'}</td>;
                            })}
                        </tr>
                        <tr>
                            <td className="p-1.5 text-slate-300 sticky left-0 bg-slate-700 z-10 min-w-[100px] truncate" title={game.awayTeam.name}>{game.awayTeam.name}</td>
                            {periodLabels.map(label => {
                                const scoreItem = perQuarterScoresData.find(item => item.periodLabel === label);
                                return <td key={`${label}-away`} className="p-1.5 text-center text-slate-300">{scoreItem ? scoreItem.awayScore : '-'}</td>;
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};


  return (
    <>
      <div
        ref={cardRef}
        className="bg-brand-surface p-4 rounded-lg shadow-md transition-all relative cursor-pointer"
        onMouseDown={(e) => handlePressStart(e.clientX, e.clientY)}
        onMouseUp={handlePressEnd}
        onMouseMove={(e) => handlePressMove(e.clientX, e.clientY)}
        onTouchStart={(e) => handlePressStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handlePressEnd}
        onTouchMove={(e) => handlePressMove(e.touches[0].clientX, e.touches[0].clientY)}
        onClick={handleCardClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e);}}
        role="button"
        tabIndex={0}
        aria-expanded={expanded || isContextMenuOpen}
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">{game.homeTeam.name} vs {game.awayTeam.name}</h3>
            <p className="text-sm text-slate-400">
              {game.startTime ? new Date(game.startTime).toLocaleDateString() : 'Fecha N/A'} - Final: {game.homeTeam.score} - {game.awayTeam.score}
            </p>
          </div>
           <button
            className="text-slate-400 hover:text-white p-1"
            onClick={(e) => {
                e.stopPropagation(); // Prevent card click from toggling expansion
                if (isContextMenuOpen) setIsContextMenuOpen(false);
                else setExpanded(!expanded);
            }}
            aria-label={expanded ? "Colapsar detalles" : "Expandir detalles"}
          >
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>

        {expanded && !isContextMenuOpen && (
          <div className="mt-4 space-y-3 text-slate-300">
            <p><strong>Duración del Partido:</strong> {game.startTime && game.endTime ? formatTime(Math.floor((new Date(game.endTime).getTime() - new Date(game.startTime).getTime()) / 1000)) : 'N/A'}</p>
            <p><strong>Resultado:</strong> {game.winningTeam === 'home' ? `${game.homeTeam.name} ganó` : game.winningTeam === 'away' ? `${game.awayTeam.name} ganó` : 'Empate'}</p>
            {renderPlayerStatsTable(game.homeTeam.name, game.homeTeam.players, game.homeTeam.stats)}
            {renderPlayerStatsTable(game.awayTeam.name, game.awayTeam.players, game.awayTeam.stats)}
            {renderPerQuarterScoresTable()}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3 pt-3 border-t border-slate-700">
              <button onClick={(e) => { e.stopPropagation(); handleExportCSV();}} className="flex-1 text-sm py-2 px-3 bg-slate-600 hover:bg-slate-500 text-white rounded-md flex items-center justify-center">
                <DocumentTextIcon className="mr-2" /> Exportar CSV
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest();}} className="flex-1 text-sm py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-md flex items-center justify-center">
                <DeleteIcon className="mr-2" /> Eliminar Partido
              </button>
            </div>
          </div>
        )}

        {isContextMenuOpen && (
          <div
            ref={contextMenuRef}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 p-3 rounded-md shadow-xl z-10 w-48 space-y-2"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it or affecting card
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleExportCSV(); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded flex items-center"
            >
              <DocumentTextIcon className="mr-2 w-4 h-4" /> Exportar CSV
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteRequest();}}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded flex items-center"
            >
              <DeleteIcon className="mr-2 w-4 h-4" /> Eliminar Partido
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación" confirmText="Sí, Eliminar" cancelText="Cancelar">
        ¿Estás seguro de que quieres eliminar este partido del historial? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  );
};

const HistoryPage: React.FC<HistoryPageProps> = ({ gameHistory, onDeleteGame }) => {
  if (gameHistory.length === 0) {
    return <p className="text-center text-slate-400 mt-8">No hay partidos en el historial.</p>;
  }
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-center text-white mb-6">Historial de Partidos</h2>
      {gameHistory.map(game => (
        <GameCard key={game.id} game={game} onDeleteGame={onDeleteGame} />
      ))}
    </div>
  );
};

export default HistoryPage;