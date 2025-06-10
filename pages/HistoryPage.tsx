

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Game, PlayerStats, StatType, Player, GameSettings, initialPlayerStats, GamePhase, GameAction } from '../types'; 
import { formatTime, DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, DeleteIcon, CheckCircleIcon, CircleIcon } from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';
import { STAT_TYPE_LABELS } from '../constants';

interface HistoryPageProps {
  gameHistory: Game[];
  onDeleteGame: (gameId: string) => void;
  onDeleteMultipleGames: (gameIds: string[]) => void; 
}

const generateCSV = (game: Game): string => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `Resumen del Partido - ${game.homeTeam.name} vs ${game.awayTeam.name}\n`;
  csvContent += `Fecha: ${game.startTime ? new Date(game.startTime).toLocaleDateString() : 'N/A'}\n`;
  csvContent += `Resultado Final: ${game.homeTeam.name} ${game.homeTeam.score} - ${game.awayTeam.name} ${game.awayTeam.score}\n\n`;

  const customHeaders = [
    "Jugador", "Equipo", "Número",
    STAT_TYPE_LABELS[StatType.POINTS_1_MADE], STAT_TYPE_LABELS[StatType.POINTS_1_ATTEMPTED], "TL%",
    STAT_TYPE_LABELS[StatType.POINTS_2_MADE], STAT_TYPE_LABELS[StatType.POINTS_2_ATTEMPTED],
    STAT_TYPE_LABELS[StatType.POINTS_3_MADE], STAT_TYPE_LABELS[StatType.POINTS_3_ATTEMPTED], "3P%",
    "TC Anotados", "TC Intentados", "FG%", 
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
  
  const formatPercentageForCSV = (made: number, attempted: number): string => {
    if (attempted === 0) return "0.0%"; 
    return ((made / attempted) * 100).toFixed(1) + "%";
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
    
    const fgm = safeNum(pStats[StatType.POINTS_2_MADE]) + safeNum(pStats[StatType.POINTS_3_MADE]);
    const fga = safeNum(pStats[StatType.POINTS_2_ATTEMPTED]) + safeNum(pStats[StatType.POINTS_3_ATTEMPTED]);
    const fgPercent = formatPercentageForCSV(fgm, fga);
    const ftPercent = formatPercentageForCSV(safeNum(pStats[StatType.POINTS_1_MADE]), safeNum(pStats[StatType.POINTS_1_ATTEMPTED]));
    const threePPercent = formatPercentageForCSV(safeNum(pStats[StatType.POINTS_3_MADE]), safeNum(pStats[StatType.POINTS_3_ATTEMPTED]));


    const row = [
      player.name,
      teamName,
      player.number,
      pStats[StatType.POINTS_1_MADE], pStats[StatType.POINTS_1_ATTEMPTED], ftPercent,
      pStats[StatType.POINTS_2_MADE], pStats[StatType.POINTS_2_ATTEMPTED],
      pStats[StatType.POINTS_3_MADE], pStats[StatType.POINTS_3_ATTEMPTED], threePPercent,
      fgm, fga, fgPercent,
      totalRebounds,
      pStats[StatType.ASSISTS],
      pStats[StatType.STEALS],
      pStats[StatType.BLOCKS],
      pStats[StatType.TURNOVERS],
      pStats[StatType.FOULS_PERSONAL],
      points
    ];
    return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + "\n"; 
  };

  csvContent += `Estadísticas de ${game.homeTeam.name}\n`;
  csvContent += customHeaders;
  game.homeTeam.players.forEach(p => csvContent += playerToRow(p, game.homeTeam.name, game.homeTeam.stats[p.id]));

  csvContent += `\nEstadísticas de ${game.awayTeam.name}\n`;
  csvContent += customHeaders;
  game.awayTeam.players.forEach(p => csvContent += playerToRow(p, game.awayTeam.name, game.awayTeam.stats[p.id]));

  return csvContent;
};

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

  const maxQuarterPlayed = game.currentQuarter; 
  const isGameFinished = game.gamePhase === GamePhase.FINISHED;

  for (let q = 1; q <= numRegulationQuarters; q++) {
    if (!isGameFinished && q > maxQuarterPlayed && !game.isOvertime) break; 
    scoresByPeriodLabel.set(`Q${q}`, { home: 0, away: 0 });
  }
  if (game.isOvertime || (isGameFinished && maxQuarterPlayed > numRegulationQuarters)) {
    const numOvertimePeriods = maxQuarterPlayed - numRegulationQuarters;
    for (let ot = 1; ot <= numOvertimePeriods; ot++) {
       if (!isGameFinished && ot > (maxQuarterPlayed - numRegulationQuarters) ) break;
       scoresByPeriodLabel.set(`OT${ot}`, { home: 0, away: 0 });
    }
  }
  
  game.gameLog.forEach(action => {
    if (action.type === 'score_update' && action.payload) {
      const payload = action.payload as Partial<ScoreUpdatePayload>;
      if (
        typeof payload.pointsScored !== 'number' ||
        typeof payload.quarter !== 'number' ||
        typeof payload.isOvertime !== 'boolean' ||
        !payload.teamId ||
        (payload.teamId !== 'home' && payload.teamId !== 'away')
      ) {
        return; 
      }
      
      const { teamId, pointsScored, quarter: actionQuarterNumber, isOvertime: actionIsOvertime } = payload as ScoreUpdatePayload;
      
      const periodLabel = actionIsOvertime
        ? `OT${actionQuarterNumber - numRegulationQuarters}`
        : `Q${actionQuarterNumber}`;

      const currentPeriodScores = scoresByPeriodLabel.get(periodLabel);
      if (currentPeriodScores) { 
        if (teamId === 'home') currentPeriodScores.home += pointsScored;
        else if (teamId === 'away') currentPeriodScores.away += pointsScored;
      }
    }
  });

  const result: QuarterScoreData[] = [];
  for (let q = 1; q <= numRegulationQuarters; q++) {
    const periodLabel = `Q${q}`;
    if (scoresByPeriodLabel.has(periodLabel)) {
      result.push({
        periodLabel,
        homeScore: scoresByPeriodLabel.get(periodLabel)!.home,
        awayScore: scoresByPeriodLabel.get(periodLabel)!.away,
      });
    } else if (isGameFinished || q <= maxQuarterPlayed) { 
        result.push({ periodLabel, homeScore: 0, awayScore: 0});
    }
  }

  if (game.isOvertime || (isGameFinished && maxQuarterPlayed > numRegulationQuarters)) {
    const numOvertimePeriods = isGameFinished ? (maxQuarterPlayed - numRegulationQuarters) : (game.currentQuarter > numRegulationQuarters ? game.currentQuarter - numRegulationQuarters : 0);
    for (let otIndex = 1; otIndex <= numOvertimePeriods; otIndex++) {
      const periodLabel = `OT${otIndex}`;
      if (scoresByPeriodLabel.has(periodLabel)) {
        result.push({
          periodLabel,
          homeScore: scoresByPeriodLabel.get(periodLabel)!.home,
          awayScore: scoresByPeriodLabel.get(periodLabel)!.away,
        });
      } else if (isGameFinished || otIndex <= (maxQuarterPlayed - numRegulationQuarters) ) {
         result.push({ periodLabel, homeScore: 0, awayScore: 0 });
      }
    }
  }
  
  if (!isGameFinished && result.length > 0) {
    let lastRelevantPeriodIndex = -1;
    for (let i = result.length - 1; i >= 0; i--) {
        const periodData = result[i];
        const periodNum = parseInt(periodData.periodLabel.replace(/[QOT]/, ''));
        const isOvertimePeriod = periodData.periodLabel.startsWith('OT');
        const absolutePeriodNum = isOvertimePeriod ? numRegulationQuarters + periodNum : periodNum;

        if (absolutePeriodNum <= game.currentQuarter || periodData.homeScore > 0 || periodData.awayScore > 0) {
            lastRelevantPeriodIndex = i;
            break;
        }
    }
    if (lastRelevantPeriodIndex !== -1 && lastRelevantPeriodIndex < result.length - 1) {
        return result.slice(0, lastRelevantPeriodIndex + 1);
    }
  }

  return result;
};


const GameCard: React.FC<{ 
  game: Game; 
  onDeleteGame: (gameId: string) => void;
  isSelected: boolean;
  onToggleSelect: (gameId: string) => void;
}> = ({ game, onDeleteGame, isSelected, onToggleSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const perQuarterScoresData = calculatePerQuarterScores(game);

  const longPressTimerRef = useRef<number | null>(null);
  const wasLongPressRef = useRef(false);
  const pressStartPointRef = useRef<{ x: number, y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null); 

  const LONG_PRESS_DURATION = 700; 
  const MOVE_THRESHOLD = 10; 

  const handlePressStart = useCallback((clientX: number, clientY: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    wasLongPressRef.current = false;
    pressStartPointRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true;
      setIsContextMenuOpen(true);
      setExpanded(false); 
    }, LONG_PRESS_DURATION);
  }, [LONG_PRESS_DURATION, setIsContextMenuOpen, setExpanded]);

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
  }, [clearLongPressTimer, MOVE_THRESHOLD]);


  const handlePressEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleCardClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) {
      return;
    }
    if (checkboxRef.current && checkboxRef.current.contains(e.target as Node)) {
        return;
    }
    
    if (wasLongPressRef.current) {
        wasLongPressRef.current = false; 
        return; 
    }

    if (isContextMenuOpen) {
        setIsContextMenuOpen(false); 
        return; 
    }
    setExpanded(prev => !prev);
  }, [isContextMenuOpen, setIsContextMenuOpen, setExpanded]);


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
    setIsContextMenuOpen(false); 
  };

  const handleDeleteRequest = () => {
    setShowConfirmDelete(true);
    setIsContextMenuOpen(false); 
  };

  const confirmDelete = () => {
    onDeleteGame(game.id);
    setShowConfirmDelete(false);
  };
  
  const safeNum = (val: any): number => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };
  
  const formatPercentage = (made: number, attempted: number): string => {
    if (attempted === 0) return "-";
    return ((made / attempted) * 100).toFixed(1) + '%';
  };

  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const bgSubSurface = "bg-slate-100 dark:bg-slate-700";
  const bgSubHeader = "bg-slate-200 dark:bg-slate-600";
  const borderSub = "border-brand-border-light dark:border-slate-600";


  const renderPlayerStatsTable = (teamName: string, players: Player[], teamStats: Record<string, PlayerStats>) => (
    <div className="mt-2">
      <h4 className={`text-md font-semibold ${textPrimary} mb-1`}>{teamName}</h4>
      <div className="overflow-x-auto">
        <table className={`min-w-full text-xs ${bgSubSurface} rounded`}>
          <thead className={bgSubHeader}>
            <tr>
              <th className={`p-1 text-left ${textPrimary}`}>Jugador (#)</th>
              <th className={`p-1 text-center ${textPrimary}`}>Pts</th><th className={`p-1 text-center ${textPrimary}`}>Reb</th><th className={`p-1 text-center ${textPrimary}`}>Ast</th>
              <th className={`p-1 text-center ${textPrimary}`}>Stl</th><th className={`p-1 text-center ${textPrimary}`}>Blk</th><th className={`p-1 text-center ${textPrimary}`}>PF</th>
              <th className={`p-1 text-center ${textPrimary}`} title="Porcentaje Tiros de Campo">FG%</th>
              <th className={`p-1 text-center ${textPrimary}`} title="Porcentaje Tiros Libres">TL%</th>
              <th className={`p-1 text-center ${textPrimary}`} title="Porcentaje Triples">3P%</th>
            </tr>
          </thead>
          <tbody className={textSecondary}>
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
              
              const fgMade = safeNum(playerStats[StatType.POINTS_2_MADE]) + safeNum(playerStats[StatType.POINTS_3_MADE]);
              const fgAttempted = safeNum(playerStats[StatType.POINTS_2_ATTEMPTED]) + safeNum(playerStats[StatType.POINTS_3_ATTEMPTED]);
              const fgPercent = formatPercentage(fgMade, fgAttempted);

              const ftMade = safeNum(playerStats[StatType.POINTS_1_MADE]);
              const ftAttempted = safeNum(playerStats[StatType.POINTS_1_ATTEMPTED]);
              const ftPercent = formatPercentage(ftMade, ftAttempted);
              
              const threeMade = safeNum(playerStats[StatType.POINTS_3_MADE]);
              const threeAttempted = safeNum(playerStats[StatType.POINTS_3_ATTEMPTED]);
              const threePercent = formatPercentage(threeMade, threeAttempted);

              return (
                <tr key={p.id} className={`border-b ${borderSub} last:border-b-0`}>
                  <td className="p-1">{p.name} ({p.number})</td>
                  <td className="p-1 text-center">{points}</td>
                  <td className="p-1 text-center">{rebounds}</td>
                  <td className="p-1 text-center">{safeNum(playerStats[StatType.ASSISTS])}</td>
                  <td className="p-1 text-center">{safeNum(playerStats[StatType.STEALS])}</td>
                  <td className="p-1 text-center">{safeNum(playerStats[StatType.BLOCKS])}</td>
                  <td className="p-1 text-center">{safeNum(Number(playerStats[StatType.FOULS_PERSONAL]))}</td>
                  <td className="p-1 text-center">{fgPercent}</td>
                  <td className="p-1 text-center">{ftPercent}</td>
                  <td className="p-1 text-center">{threePercent}</td>
                </tr>);
            })}
            {players.length === 0 && (<tr><td colSpan={10} className="p-2 text-center">Sin jugadores.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPerQuarterScoresTable = () => {
    if (perQuarterScoresData.length === 0) {
        return <p className={`text-sm ${textSecondary} mt-3 text-center`}>No hay datos de puntuación por periodo.</p>;
    }
    const periodLabels = perQuarterScoresData.map(item => item.periodLabel);

    return (
        <div className="mt-3">
            <h4 className={`text-md font-semibold ${textPrimary} mb-1`}>Puntuación por Periodo</h4>
            <div className="overflow-x-auto">
                <table className={`min-w-full text-xs ${bgSubSurface} rounded`}>
                    <thead className={bgSubHeader}>
                        <tr>
                            <th className={`p-1.5 text-left ${textPrimary} sticky left-0 ${bgSubHeader} z-10 min-w-[100px] truncate`}>Equipo</th>
                            {periodLabels.map(label => (
                                <th key={label} className={`p-1.5 text-center ${textPrimary} min-w-[40px]`}>{label}</th>
                            ))}
                            <th className={`p-1.5 text-center ${textPrimary} font-semibold min-w-[50px]`}>Total</th>
                        </tr>
                    </thead>
                    <tbody className={textSecondary}>
                        <tr className={`border-b ${borderSub}`}>
                            <td className={`p-1.5 sticky left-0 ${bgSubSurface} z-10 min-w-[100px] truncate`} title={game.homeTeam.name}>{game.homeTeam.name}</td>
                            {periodLabels.map(label => {
                                const scoreItem = perQuarterScoresData.find(item => item.periodLabel === label);
                                return <td key={`${label}-home`} className="p-1.5 text-center">{scoreItem ? scoreItem.homeScore : '0'}</td>;
                            })}
                            <td className="p-1.5 text-center font-semibold">{game.homeTeam.score}</td>
                        </tr>
                        <tr>
                            <td className={`p-1.5 sticky left-0 ${bgSubSurface} z-10 min-w-[100px] truncate`} title={game.awayTeam.name}>{game.awayTeam.name}</td>
                            {periodLabels.map(label => {
                                const scoreItem = perQuarterScoresData.find(item => item.periodLabel === label);
                                return <td key={`${label}-away`} className="p-1.5 text-center">{scoreItem ? scoreItem.awayScore : '0'}</td>;
                            })}
                            <td className="p-1.5 text-center font-semibold">{game.awayTeam.score}</td>
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
        className={`${bgSurface} p-4 rounded-lg shadow-md transition-all relative 
                    ${isSelected ? 'ring-2 ring-brand-accent-light dark:ring-brand-accent' : ''}
                    ${isContextMenuOpen ? '' : 'cursor-pointer'}`}
        onMouseDown={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressStart(e.clientX, e.clientY); }}
        onMouseUp={handlePressEnd}
        onMouseMove={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressMove(e.clientX, e.clientY); }}
        onTouchStart={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressStart(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={handlePressEnd}
        onTouchMove={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onClick={handleCardClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e);}}
        role="button"
        tabIndex={0}
        aria-expanded={expanded || isContextMenuOpen}
        aria-selected={isSelected}
      >
        <div className="flex justify-between items-start">
          <div 
            className="flex items-center space-x-3 flex-grow"
            onClick={(e) => {
                if (checkboxRef.current?.contains(e.target as Node)) {
                    e.stopPropagation(); 
                    onToggleSelect(game.id);
                }
            }}
          >
             <input
                ref={checkboxRef}
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                    e.stopPropagation(); 
                    onToggleSelect(game.id);
                }}
                onClick={(e) => e.stopPropagation()} 
                className={`form-checkbox h-5 w-5 text-brand-accent-light dark:text-brand-accent bg-slate-200 dark:bg-slate-600 border-brand-border-light dark:border-slate-500 rounded focus:ring-brand-accent-light dark:focus:ring-brand-accent focus:ring-offset-brand-surface-light dark:focus:ring-offset-brand-surface`}
                aria-label={`Seleccionar partido ${game.homeTeam.name} vs ${game.awayTeam.name}`}
              />
            <div className="flex-grow">
              <h3 className={`text-lg font-semibold ${textPrimary}`}>{game.homeTeam.name} vs {game.awayTeam.name}</h3>
              <p className={`text-sm ${textSecondary}`}>
                {game.startTime ? new Date(game.startTime).toLocaleDateString() : 'Fecha N/A'} - Final: {game.homeTeam.score} - {game.awayTeam.score}
              </p>
            </div>
          </div>
           <button
            className={`${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white p-1 flex-shrink-0`}
            onClick={(e) => {
                e.stopPropagation(); 
                if (isContextMenuOpen) setIsContextMenuOpen(false);
                else setExpanded(!expanded);
            }}
            aria-label={expanded ? "Colapsar detalles" : "Expandir detalles"}
          >
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>

        {expanded && !isContextMenuOpen && (
          <div className={`mt-4 space-y-3 ${textSecondary}`}>
            <p><strong>Duración del Partido:</strong> {game.startTime && game.endTime ? formatTime(Math.floor((new Date(game.endTime).getTime() - new Date(game.startTime).getTime()) / 1000)) : 'N/A'}</p>
            <p><strong>Resultado:</strong> {game.winningTeam === 'home' ? `${game.homeTeam.name} ganó` : game.winningTeam === 'away' ? `${game.awayTeam.name} ganó` : 'Empate'}</p>
            {renderPlayerStatsTable(game.homeTeam.name, game.homeTeam.players, game.homeTeam.stats)}
            {renderPlayerStatsTable(game.awayTeam.name, game.awayTeam.players, game.awayTeam.stats)}
            {renderPerQuarterScoresTable()}
            <div className={`flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3 pt-3 border-t ${borderSub}`}>
              <button onClick={(e) => { e.stopPropagation(); handleExportCSV();}} className={`flex-1 text-sm py-2 px-3 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-brand-text-primary-light dark:text-white rounded-md flex items-center justify-center`}>
                <DocumentTextIcon className="mr-2" /> Exportar CSV
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest();}} className={`flex-1 text-sm py-2 px-3 bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-md flex items-center justify-center`}>
                <DeleteIcon className="mr-2" /> Eliminar Partido
              </button>
            </div>
          </div>
        )}

        {isContextMenuOpen && (
          <div
            ref={contextMenuRef}
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-100 dark:bg-slate-800 p-3 rounded-md shadow-xl z-10 w-48 space-y-2`}
            onClick={(e) => e.stopPropagation()} 
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleExportCSV(); }}
              className={`w-full text-left px-3 py-2 text-sm text-brand-text-primary-light dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center`}
            >
              <DocumentTextIcon className="mr-2 w-4 h-4" /> Exportar CSV
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteRequest();}}
              className={`w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center`}
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

const HistoryPage: React.FC<HistoryPageProps> = ({ gameHistory, onDeleteGame, onDeleteMultipleGames }) => {
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showConfirmDeleteMultiple, setShowConfirmDeleteMultiple] = useState(false);

  const toggleGameSelection = (gameId: string) => {
    setSelectedGameIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(gameId)) {
        newSelected.delete(gameId);
      } else {
        newSelected.add(gameId);
      }
      return newSelected;
    });
  };

  const toggleSelectAllGames = () => {
    if (selectedGameIds.size === gameHistory.length) {
      setSelectedGameIds(new Set()); 
    } else {
      setSelectedGameIds(new Set(gameHistory.map(g => g.id))); 
    }
  };

  const handleDeleteSelectedRequest = () => {
    if (selectedGameIds.size === 0) return;
    setShowConfirmDeleteMultiple(true);
  };

  const confirmDeleteMultipleGames = () => {
    onDeleteMultipleGames(Array.from(selectedGameIds));
    setSelectedGameIds(new Set());
    setShowConfirmDeleteMultiple(false);
  };

  const handleExportSelected = () => {
    if (selectedGameIds.size === 0) return;
    Array.from(selectedGameIds).forEach(id => {
      const game = gameHistory.find(g => g.id === id);
      if (game) {
        const csvData = generateCSV(game);
        const encodedUri = encodeURI(csvData);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `partido_${game.homeTeam.name}_vs_${game.awayTeam.name}_${game.id.substring(0,6)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const borderDefault = "border-brand-border-light dark:border-slate-600";
  const ringAccent = "focus:ring-brand-accent-light dark:focus:ring-brand-accent";
  const ringOffsetSurface = "focus:ring-offset-brand-surface-light dark:focus:ring-offset-brand-surface";


  if (gameHistory.length === 0) {
    return <p className={`text-center ${textSecondary} mt-8`}>No hay partidos en el historial.</p>;
  }
  const allSelected = gameHistory.length > 0 && selectedGameIds.size === gameHistory.length;

  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-semibold text-center ${textPrimary} mb-6`}>Historial de Partidos</h2>
      
      {gameHistory.length > 0 && (
        <div className={`mb-4 p-4 ${bgSurface} rounded-lg shadow-md space-y-3 md:space-y-0 md:flex md:items-center md:justify-between`}>
          <button
            onClick={toggleSelectAllGames}
            className={`w-full md:w-auto flex items-center justify-center px-4 py-2 ${borderDefault} text-sm font-medium rounded-md ${textSecondary} hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 ${ringOffsetSurface} ${ringAccent}`}
          >
            {allSelected ? <CheckCircleIcon className="w-5 h-5 mr-2 text-green-500 dark:text-green-400" /> : <CircleIcon className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-500" />}
            {allSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'} ({selectedGameIds.size}/{gameHistory.length})
          </button>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3 md:mt-0">
            <button
              onClick={handleExportSelected}
              disabled={selectedGameIds.size === 0}
              className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 ${ringOffsetSurface} focus:ring-blue-500 disabled:opacity-50`}
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Exportar ({selectedGameIds.size})
            </button>
            <button
              onClick={handleDeleteSelectedRequest}
              disabled={selectedGameIds.size === 0}
              className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 ${ringOffsetSurface} focus:ring-red-500 disabled:opacity-50`}
            >
              <DeleteIcon className="w-5 h-5 mr-2" />
              Eliminar ({selectedGameIds.size})
            </button>
          </div>
        </div>
      )}

      {gameHistory.map(game => (
        <GameCard 
            key={game.id} 
            game={game} 
            onDeleteGame={onDeleteGame}
            isSelected={selectedGameIds.has(game.id)}
            onToggleSelect={toggleGameSelection}
        />
      ))}
       <ConfirmDialog
        isOpen={showConfirmDeleteMultiple}
        onClose={() => setShowConfirmDeleteMultiple(false)}
        onConfirm={confirmDeleteMultipleGames}
        title={`Confirmar Eliminación de ${selectedGameIds.size} Partido(s)`}
        confirmText="Sí, Eliminar Seleccionados"
        cancelText="Cancelar"
      >
        ¿Estás seguro de que quieres eliminar los {selectedGameIds.size} partidos seleccionados del historial? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  );
};

export default HistoryPage;
