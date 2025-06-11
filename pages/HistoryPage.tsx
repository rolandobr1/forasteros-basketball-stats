
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Game, PlayerStats, StatType, Player, GameSettings, initialPlayerStats, GamePhase, GameAction } from '../types'; 
import { formatTime, DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, DeleteIcon, CheckCircleIcon, CircleIcon } from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';
import { STAT_TYPE_LABELS } from '../constants';

interface HistoryPageProps {
  gameHistory: Game[];
  onDeleteGame: (gameId: string) => void;
}

const generateCSV = (game: Game): string => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `Resumen del Partido - ${game.homeTeam.name} vs ${game.awayTeam.name}\n`;
  csvContent += `Fecha: ${game.startTime ? new Date(game.startTime).toLocaleDateString() : 'N/A'}\n`;
  csvContent += `Resultado Final: ${game.homeTeam.name} ${game.homeTeam.score} - ${game.awayTeam.name} ${game.awayTeam.score}\n\n`;
  const customHeaders = [ "Jugador", "Equipo", "Número", STAT_TYPE_LABELS[StatType.POINTS_1_MADE], STAT_TYPE_LABELS[StatType.POINTS_1_ATTEMPTED], "TL%", STAT_TYPE_LABELS[StatType.POINTS_2_MADE], STAT_TYPE_LABELS[StatType.POINTS_2_ATTEMPTED], "2P%", STAT_TYPE_LABELS[StatType.POINTS_3_MADE], STAT_TYPE_LABELS[StatType.POINTS_3_ATTEMPTED], "3P%", "TC Anotados", "TC Intentados", "FG%", "Rebotes Totales", STAT_TYPE_LABELS[StatType.ASSISTS], STAT_TYPE_LABELS[StatType.STEALS], STAT_TYPE_LABELS[StatType.BLOCKS], STAT_TYPE_LABELS[StatType.TURNOVERS], STAT_TYPE_LABELS[StatType.FOULS_PERSONAL], "Total Puntos" ].join(',') + "\n";
  const safeNum = (val: any): number => { const n = Number(val); return isNaN(n) ? 0 : n; };
  const formatPercentageForCSV = (made: number, attempted: number): string => attempted === 0 ? "0.0%" : ((made / attempted) * 100).toFixed(1) + "%";
  
  const playerToRow = (player: Player, teamName: string, playerStatsData: PlayerStats | undefined): string => {
    const statsSource = playerStatsData || initialPlayerStats; 
    const pStats: PlayerStats = { ...initialPlayerStats }; 
    for (const key of Object.keys(initialPlayerStats)) { 
        const statKey = key as StatType; 
        if (Object.prototype.hasOwnProperty.call(statsSource, statKey)) {
            pStats[statKey] = safeNum(statsSource[statKey]); 
        }
    }
    const points = safeNum(pStats[StatType.POINTS_1_MADE]) + safeNum(pStats[StatType.POINTS_2_MADE]) * 2 + safeNum(pStats[StatType.POINTS_3_MADE]) * 3;
    const totalRebounds = safeNum(pStats[StatType.REBOUNDS_OFFENSIVE]) + safeNum(pStats[StatType.REBOUNDS_DEFENSIVE]);
    const fgm_2pt = safeNum(pStats[StatType.POINTS_2_MADE]);
    const fga_2pt = safeNum(pStats[StatType.POINTS_2_ATTEMPTED]);
    const fgm_3pt = safeNum(pStats[StatType.POINTS_3_MADE]);
    const fga_3pt = safeNum(pStats[StatType.POINTS_3_ATTEMPTED]);
    const total_fgm = fgm_2pt + fgm_3pt;
    const total_fga = fga_2pt + fga_3pt;

    const row = [ 
        player.name, 
        teamName, 
        player.number, 
        pStats[StatType.POINTS_1_MADE], 
        pStats[StatType.POINTS_1_ATTEMPTED], 
        formatPercentageForCSV(safeNum(pStats[StatType.POINTS_1_MADE]), safeNum(pStats[StatType.POINTS_1_ATTEMPTED])), 
        fgm_2pt, 
        fga_2pt, 
        formatPercentageForCSV(fgm_2pt, fga_2pt),
        fgm_3pt, 
        fga_3pt, 
        formatPercentageForCSV(fgm_3pt, fga_3pt), 
        total_fgm, 
        total_fga,
        formatPercentageForCSV(total_fgm, total_fga),
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
  csvContent += `Estadísticas de ${game.homeTeam.name}\n${customHeaders}`;
  game.homeTeam.players.forEach(p => csvContent += playerToRow(p, game.homeTeam.name, game.homeTeam.stats[p.id]));
  csvContent += `\nEstadísticas de ${game.awayTeam.name}\n${customHeaders}`;
  game.awayTeam.players.forEach(p => csvContent += playerToRow(p, game.awayTeam.name, game.awayTeam.stats[p.id]));
  return csvContent;
};

interface QuarterScoreData { periodLabel: string; homeScore: number; awayScore: number; }
interface ScoreUpdatePayload { teamId: 'home' | 'away'; pointsScored: number; quarter: number; isOvertime: boolean; }

const calculatePerQuarterScores = (game: Game): QuarterScoreData[] => {
  const scoresByPeriodLabel = new Map<string, { home: number; away: number }>();
  const numRegulationQuarters = Number(game.settings.quarters); 
  const maxQuarterPlayed = game.currentQuarter; 
  const isGameFinished = game.gamePhase === GamePhase.FINISHED;
  
  // Initialize periods based on settings and game progress
  for (let q = 1; q <= numRegulationQuarters; q++) { 
    if (!isGameFinished && q > maxQuarterPlayed && !game.isOvertime) break; 
    scoresByPeriodLabel.set(`Q${q}`, { home: 0, away: 0 }); 
  }
  
  if (game.isOvertime || (isGameFinished && maxQuarterPlayed > numRegulationQuarters)) {
    const numOvertimePeriods = isGameFinished ? (game.currentQuarter > numRegulationQuarters ? game.currentQuarter - numRegulationQuarters : 0) : (maxQuarterPlayed > numRegulationQuarters ? maxQuarterPlayed - numRegulationQuarters : 0) ;
    for (let ot = 1; ot <= numOvertimePeriods; ot++) { 
        if(!scoresByPeriodLabel.has(`OT${ot}`)) { // Check if not already added
             scoresByPeriodLabel.set(`OT${ot}`, { home: 0, away: 0 }); 
        }
    }
  }

  game.gameLog.forEach(action => {
    if (action.type === 'score_update' && action.payload) {
      const payload = action.payload as Partial<ScoreUpdatePayload>;
      if (typeof payload.pointsScored !== 'number' || typeof payload.quarter !== 'number' || typeof payload.isOvertime !== 'boolean' || !payload.teamId || (payload.teamId !== 'home' && payload.teamId !== 'away')) return; 
      const { teamId, pointsScored, quarter: actionQuarterNumber, isOvertime: actionIsOvertime } = payload as ScoreUpdatePayload;
      const periodLabel = actionIsOvertime ? `OT${actionQuarterNumber - numRegulationQuarters}` : `Q${actionQuarterNumber}`;
      const currentPeriodScores = scoresByPeriodLabel.get(periodLabel);
      if (currentPeriodScores) { if (teamId === 'home') currentPeriodScores.home += pointsScored; else if (teamId === 'away') currentPeriodScores.away += pointsScored; }
      else { // If period was not pre-initialized (e.g. game ended abruptly or log is ahead of currentQuarter state)
        if(isGameFinished) scoresByPeriodLabel.set(periodLabel, { home: (teamId === 'home' ? pointsScored : 0) , away: (teamId === 'away' ? pointsScored : 0) });
      }
    }
  });
  
  const result: QuarterScoreData[] = [];
  // Regulation Quarters
  for (let q = 1; q <= numRegulationQuarters; q++) {
    const periodLabel = `Q${q}`;
    if (scoresByPeriodLabel.has(periodLabel)) {
      result.push({ periodLabel, homeScore: scoresByPeriodLabel.get(periodLabel)!.home, awayScore: scoresByPeriodLabel.get(periodLabel)!.away });
    } else if (isGameFinished || q <= maxQuarterPlayed) { // If finished, show all regulation periods even if no score
      result.push({ periodLabel, homeScore: 0, awayScore: 0});
    }
  }
  // Overtime Periods
  const actualMaxPeriodNumber = game.currentQuarter; // The highest period number recorded in the game state
  const numOvertimePeriodsPlayed = game.isOvertime ? actualMaxPeriodNumber - numRegulationQuarters : 0;

  for (let otIndex = 1; otIndex <= numOvertimePeriodsPlayed; otIndex++) {
    const periodLabel = `OT${otIndex}`;
    if (scoresByPeriodLabel.has(periodLabel)) {
      result.push({ periodLabel, homeScore: scoresByPeriodLabel.get(periodLabel)!.home, awayScore: scoresByPeriodLabel.get(periodLabel)!.away });
    } else if (isGameFinished || (game.isOvertime && otIndex <= numOvertimePeriodsPlayed)) { // If finished or game is in this OT, show it
      result.push({ periodLabel, homeScore: 0, awayScore: 0 });
    }
  }
  // Trim empty future periods if game is not finished
  if (!isGameFinished && result.length > 0) {
    let lastRelevantPeriodIndex = -1;
    for (let i = result.length - 1; i >= 0; i--) {
        const periodData = result[i]; const periodNumStr = periodData.periodLabel.replace(/[QOT]/, '');
        if (!periodNumStr) continue; // Skip if label is malformed
        const periodNum = parseInt(periodNumStr);
        const isOvertimePeriod = periodData.periodLabel.startsWith('OT'); 
        const absolutePeriodNum = isOvertimePeriod ? numRegulationQuarters + periodNum : periodNum;
        if (absolutePeriodNum <= game.currentQuarter || periodData.homeScore > 0 || periodData.awayScore > 0) { lastRelevantPeriodIndex = i; break; }
    }
    if (lastRelevantPeriodIndex !== -1 && lastRelevantPeriodIndex < result.length - 1) return result.slice(0, lastRelevantPeriodIndex + 1);
  }
  return result;
};


const GameCard: React.FC<{ game: Game; onDeleteGame: (gameId: string) => void; isSelected: boolean; onToggleSelect: (gameId: string) => void; }> = React.memo(({ game, onDeleteGame, isSelected, onToggleSelect }) => {
  const [expanded, setExpanded] = useState(false); 
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); 
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  
  const perQuarterScoresData = useMemo(() => calculatePerQuarterScores(game), [game]);

  const longPressTimerRef = useRef<number | null>(null); 
  const wasLongPressRef = useRef(false); 
  const pressStartPointRef = useRef<{ x: number, y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null); 
  const contextMenuRef = useRef<HTMLDivElement>(null); 
  const checkboxRef = useRef<HTMLInputElement>(null);
  const LONG_PRESS_DURATION = 700; 
  const MOVE_THRESHOLD = 10;

  const clearLongPressTimer = useCallback(() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }, []);

  const handlePressStart = useCallback((clientX: number, clientY: number) => {
    clearLongPressTimer();
    wasLongPressRef.current = false; pressStartPointRef.current = { x: clientX, y: clientY };
    longPressTimerRef.current = window.setTimeout(() => { wasLongPressRef.current = true; setIsContextMenuOpen(true); setExpanded(false); }, LONG_PRESS_DURATION);
  }, [LONG_PRESS_DURATION, setIsContextMenuOpen, setExpanded, clearLongPressTimer]);
  
  const handlePressMove = useCallback((clientX: number, clientY: number) => {
    if (!pressStartPointRef.current || !longPressTimerRef.current) return;
    const deltaX = Math.abs(clientX - pressStartPointRef.current.x); const deltaY = Math.abs(clientY - pressStartPointRef.current.y);
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) { clearLongPressTimer(); pressStartPointRef.current = null; }
  }, [clearLongPressTimer, MOVE_THRESHOLD]);

  const handlePressEnd = useCallback(() => clearLongPressTimer(), [clearLongPressTimer]);

  const handleCardClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) return;
    if (checkboxRef.current && checkboxRef.current.contains(e.target as Node)) return;
    if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }
    if (isContextMenuOpen) { setIsContextMenuOpen(false); return; }
    setExpanded(prev => !prev);
  }, [isContextMenuOpen, setIsContextMenuOpen, setExpanded]);

  useEffect(() => {
    if (!isContextMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => { 
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node) && 
            cardRef.current && !cardRef.current.contains(event.target as Node) ) {
            setIsContextMenuOpen(false); 
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isContextMenuOpen]);

  const handleExportCSV = useCallback(() => { const csvData = generateCSV(game); const encodedUri = encodeURI(csvData); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `partido_${game.homeTeam.name}_vs_${game.awayTeam.name}_${game.id.substring(0,6)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); setIsContextMenuOpen(false); }, [game]);
  const handleDeleteRequest = useCallback(() => { setShowConfirmDelete(true); setIsContextMenuOpen(false); }, []);
  const confirmDelete = useCallback(() => { onDeleteGame(game.id); setShowConfirmDelete(false); }, [game.id, onDeleteGame]);
  
  const safeNum = (val: any): number => { const n = Number(val); return isNaN(n) ? 0 : n; };
  
  const renderPlayerStatsTable = (teamName: string, players: Player[], teamStats: Record<string, PlayerStats>) => {
    const formatMadeAttempted = (made: number, attempted: number) => `${made}/${attempted}`;
    
    return (
    <div className="mt-2">
      <h4 className="text-md font-semibold text-gray-700 dark:text-slate-200 mb-1">{teamName}</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs bg-gray-50 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300">
          <thead className="bg-gray-100 dark:bg-slate-600">
            <tr>
              <th className="p-1 text-left">Jugador (#)</th>
              <th className="p-1 text-center">Pts</th><th className="p-1 text-center">Reb</th><th className="p-1 text-center">Ast</th>
              <th className="p-1 text-center">Stl</th><th className="p-1 text-center">Blk</th><th className="p-1 text-center">PF</th>
              <th className="p-1 text-center" title="Tiros Libres (Anotados/Intentados)">TL (M/A)</th>
              <th className="p-1 text-center" title="Tiros de 2 Puntos (Anotados/Intentados)">2P (M/A)</th>
              <th className="p-1 text-center" title="Tiros de 3 Puntos (Anotados/Intentados)">3P (M/A)</th>
              <th className="p-1 text-center" title="Tiros de Campo Totales (Anotados/Intentados)">TC (M/A)</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const statsSource = teamStats[p.id] || initialPlayerStats; 
              const playerStats: PlayerStats = { ...initialPlayerStats };
              for (const key of Object.keys(initialPlayerStats)) { 
                  const statKey = key as StatType; 
                  if (Object.prototype.hasOwnProperty.call(statsSource, statKey)) {
                      playerStats[statKey] = safeNum(statsSource[statKey]); 
                  }
              }
              const points = playerStats[StatType.POINTS_1_MADE] + playerStats[StatType.POINTS_2_MADE] * 2 + playerStats[StatType.POINTS_3_MADE] * 3;
              const rebounds = playerStats[StatType.REBOUNDS_OFFENSIVE] + playerStats[StatType.REBOUNDS_DEFENSIVE];
              const fgMade = playerStats[StatType.POINTS_2_MADE] + playerStats[StatType.POINTS_3_MADE];
              const fgAttempted = playerStats[StatType.POINTS_2_ATTEMPTED] + playerStats[StatType.POINTS_3_ATTEMPTED];
              return ( <tr key={p.id} className="border-b border-gray-200 dark:border-slate-600 last:border-b-0">
                  <td className="p-1">{p.name} ({p.number})</td>
                  <td className="p-1 text-center">{points}</td>
                  <td className="p-1 text-center">{rebounds}</td>
                  <td className="p-1 text-center">{playerStats[StatType.ASSISTS]}</td>
                  <td className="p-1 text-center">{playerStats[StatType.STEALS]}</td>
                  <td className="p-1 text-center">{playerStats[StatType.BLOCKS]}</td>
                  <td className="p-1 text-center">{playerStats[StatType.FOULS_PERSONAL]}</td>
                  <td className="p-1 text-center">{formatMadeAttempted(playerStats[StatType.POINTS_1_MADE], playerStats[StatType.POINTS_1_ATTEMPTED])}</td>
                  <td className="p-1 text-center">{formatMadeAttempted(playerStats[StatType.POINTS_2_MADE], playerStats[StatType.POINTS_2_ATTEMPTED])}</td>
                  <td className="p-1 text-center">{formatMadeAttempted(playerStats[StatType.POINTS_3_MADE], playerStats[StatType.POINTS_3_ATTEMPTED])}</td>
                  <td className="p-1 text-center">{formatMadeAttempted(fgMade, fgAttempted)}</td>
                </tr>);
            })}
            {players.length === 0 && (<tr><td colSpan={11} className="p-2 text-center text-gray-500 dark:text-slate-400">Sin jugadores.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );};

  const renderPerQuarterScoresTable = () => {
    if (perQuarterScoresData.length === 0) return <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 text-center">No hay datos de puntuación.</p>;
    const periodLabels = perQuarterScoresData.map(item => item.periodLabel);
    return (
        <div className="mt-3">
            <h4 className="text-md font-semibold text-gray-700 dark:text-slate-200 mb-1">Puntuación por Periodo</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs bg-gray-50 dark:bg-slate-700 rounded">
                    <thead className="bg-gray-100 dark:bg-slate-600">
                        <tr>
                            <th className="p-1.5 text-left text-gray-700 dark:text-slate-200 sticky left-0 bg-gray-100 dark:bg-slate-600 z-10 min-w-[100px] truncate">Equipo</th>
                            {periodLabels.map(label => (<th key={label} className="p-1.5 text-center text-gray-700 dark:text-slate-200 min-w-[40px]">{label}</th> ))}
                            <th className="p-1.5 text-center text-gray-800 dark:text-slate-100 font-semibold min-w-[50px]">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-slate-300">
                        <tr className="border-b border-gray-200 dark:border-slate-600">
                            <td className="p-1.5 sticky left-0 bg-gray-50 dark:bg-slate-700 z-10 min-w-[100px] truncate" title={game.homeTeam.name}>{game.homeTeam.name}</td>
                            {periodLabels.map(label => { const scoreItem = perQuarterScoresData.find(item => item.periodLabel === label); return <td key={`${label}-home`} className="p-1.5 text-center">{scoreItem ? scoreItem.homeScore : '0'}</td>; })}
                            <td className="p-1.5 text-center text-gray-800 dark:text-slate-100 font-semibold">{game.homeTeam.score}</td>
                        </tr>
                        <tr>
                            <td className="p-1.5 sticky left-0 bg-gray-50 dark:bg-slate-700 z-10 min-w-[100px] truncate" title={game.awayTeam.name}>{game.awayTeam.name}</td>
                            {periodLabels.map(label => { const scoreItem = perQuarterScoresData.find(item => item.periodLabel === label); return <td key={`${label}-away`} className="p-1.5 text-center">{scoreItem ? scoreItem.awayScore : '0'}</td>; })}
                            <td className="p-1.5 text-center text-gray-800 dark:text-slate-100 font-semibold">{game.awayTeam.score}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>);};

  return ( <>
      <div ref={cardRef} className={`bg-white dark:bg-brand-surface p-4 rounded-lg shadow-md transition-all relative ${isSelected ? 'ring-2 ring-brand-accent' : ''} ${isContextMenuOpen ? '' : 'cursor-pointer'}`}
        onMouseDown={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressStart(e.clientX, e.clientY); }} onMouseUp={handlePressEnd} onMouseMove={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressMove(e.clientX, e.clientY); }}
        onTouchStart={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressStart(e.touches[0].clientX, e.touches[0].clientY); }} onTouchEnd={handlePressEnd} onTouchMove={(e) => { if (!checkboxRef.current?.contains(e.target as Node)) handlePressMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onClick={handleCardClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e);}} role="button" tabIndex={0} aria-expanded={expanded || isContextMenuOpen} aria-selected={isSelected}>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3 flex-grow" onClick={(e) => { if (checkboxRef.current?.contains(e.target as Node)) { e.stopPropagation(); onToggleSelect(game.id); } }}>
             <input ref={checkboxRef} type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onToggleSelect(game.id); }} onClick={(e) => e.stopPropagation()}
                className="form-checkbox h-5 w-5 text-brand-accent bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-brand-accent focus:ring-offset-white dark:focus:ring-offset-brand-surface"
                aria-label={`Seleccionar partido ${game.homeTeam.name} vs ${game.awayTeam.name}`} />
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{game.homeTeam.name} vs {game.awayTeam.name}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">{game.startTime ? new Date(game.startTime).toLocaleDateString() : 'Fecha N/A'} - Final: {game.homeTeam.score} - {game.awayTeam.score}</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); setIsContextMenuOpen(false); }} className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white" aria-label={expanded ? "Colapsar detalles" : "Expandir detalles"}>
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 space-y-3">
            {renderPerQuarterScoresTable()}
            {renderPlayerStatsTable(game.homeTeam.name, game.homeTeam.players, game.homeTeam.stats)}
            {renderPlayerStatsTable(game.awayTeam.name, game.awayTeam.players, game.awayTeam.stats)}
            <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                <button onClick={(e) => { e.stopPropagation(); handleExportCSV(); }} className="flex-1 py-1.5 px-3 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center justify-center"><DocumentTextIcon className="w-3.5 h-3.5 mr-1" />Exportar CSV</button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(); }} className="flex-1 py-1.5 px-3 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center"><DeleteIcon className="w-3.5 h-3.5 mr-1" />Eliminar Partido</button>
            </div>
          </div>
        )}
        {isContextMenuOpen && (
          <div ref={contextMenuRef} className="absolute top-10 right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5">
            <button onClick={(e) => { e.stopPropagation(); handleExportCSV(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700 flex items-center"><DocumentTextIcon className="w-4 h-4 mr-2"/>Exportar CSV</button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-slate-700 flex items-center"><DeleteIcon className="w-4 h-4 mr-2"/>Eliminar Partido</button>
          </div>
        )}
      </div>
      <ConfirmDialog isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} onConfirm={confirmDelete} title="Confirmar Eliminación" confirmText="Eliminar">
        ¿Estás seguro de que quieres eliminar este partido del historial? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  );
});


const HistoryPage: React.FC<HistoryPageProps> = React.memo(({ gameHistory, onDeleteGame }) => {
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showConfirmDeleteSelected, setShowConfirmDeleteSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredAndSortedGames = useMemo(() => gameHistory
    .filter(game => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return game.homeTeam.name.toLowerCase().includes(lowerSearch) ||
             game.awayTeam.name.toLowerCase().includes(lowerSearch) ||
             (game.startTime && new Date(game.startTime).toLocaleDateString().includes(lowerSearch));
    })
    .sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    }), [gameHistory, searchTerm, sortOrder]);

  const toggleSelectGame = useCallback((gameId: string) => {
    setSelectedGameIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) newSet.delete(gameId); else newSet.add(gameId);
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedGameIds.size === filteredAndSortedGames.length) setSelectedGameIds(new Set());
    else setSelectedGameIds(new Set(filteredAndSortedGames.map(g => g.id)));
  }, [selectedGameIds.size, filteredAndSortedGames]);

  const handleDeleteSelectedRequest = useCallback(() => {
    if (selectedGameIds.size === 0) return;
    setShowConfirmDeleteSelected(true);
  }, [selectedGameIds.size]);

  const confirmDeleteSelected = useCallback(() => {
    selectedGameIds.forEach(id => onDeleteGame(id));
    setSelectedGameIds(new Set());
    setShowConfirmDeleteSelected(false);
  }, [selectedGameIds, onDeleteGame]);
  
  const handleCloseConfirmDeleteSelected = useCallback(() => setShowConfirmDeleteSelected(false), []);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">Historial de Partidos</h1>
      
      <div className="bg-white dark:bg-brand-surface p-4 rounded-lg shadow-md space-y-3">
        <input type="text" placeholder="Buscar por equipo o fecha..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2.5 rounded border bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600 focus:border-brand-accent focus:ring-brand-accent select-auto" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <label htmlFor="sortOrder" className="text-sm text-gray-600 dark:text-slate-300">Ordenar por:</label>
            <select id="sortOrder" value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="p-1.5 rounded border bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white text-sm border-gray-300 dark:border-slate-600 focus:border-brand-accent">
              <option value="newest">Más Recientes Primero</option>
              <option value="oldest">Más Antiguos Primero</option>
            </select>
          </div>
          {gameHistory.length > 0 && (
            <div className="flex items-center space-x-2">
                <button onClick={handleSelectAll} className="p-1.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-white rounded flex items-center">
                    {selectedGameIds.size === filteredAndSortedGames.length && filteredAndSortedGames.length > 0 ? <CheckCircleIcon className="w-4 h-4 mr-1 text-brand-accent"/> : <CircleIcon className="w-4 h-4 mr-1"/>}
                    {selectedGameIds.size === filteredAndSortedGames.length && filteredAndSortedGames.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Todos'} ({selectedGameIds.size})
                </button>
                {selectedGameIds.size > 0 && <button onClick={handleDeleteSelectedRequest} className="p-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded flex items-center"><DeleteIcon className="w-3.5 h-3.5 mr-1"/>Eliminar Seleccionados</button>}
            </div>
          )}
        </div>
      </div>

      {filteredAndSortedGames.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-slate-400 mt-8 text-lg">
          {gameHistory.length === 0 ? "No hay partidos en el historial." : "No se encontraron partidos con los criterios de búsqueda."}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedGames.map(game => (
            <GameCard key={game.id} game={game} onDeleteGame={onDeleteGame} isSelected={selectedGameIds.has(game.id)} onToggleSelect={toggleSelectGame}/>
          ))}
        </div>
      )}
      <ConfirmDialog 
        isOpen={showConfirmDeleteSelected} 
        onClose={handleCloseConfirmDeleteSelected} 
        onConfirm={confirmDeleteSelected} 
        title="Confirmar Eliminación Múltiple" 
        confirmText={`Eliminar (${selectedGameIds.size})`}>
        ¿Estás seguro de que quieres eliminar los {selectedGameIds.size} partidos seleccionados del historial? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  );
});

export default HistoryPage;
