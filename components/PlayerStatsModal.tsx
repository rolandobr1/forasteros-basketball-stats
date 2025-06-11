
import React, { useState, useEffect, useCallback } from 'react';
import { Player, PlayerStats, StatType, TeamType } from '../types';
import { STAT_TYPE_LABELS, POINTS_STATS, OTHER_STATS } from '../constants';
import { PlusIcon, MinusIcon, XMarkIcon } from '../utils';
import AlertDialog from './AlertDialog';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  teamType: TeamType;
  currentStats: PlayerStats;
  onSaveStats: (player: Player, teamType: TeamType, newStats: PlayerStats) => void;
  maxPersonalFouls: number;
  allowFoulOuts: boolean;
}

const StatButton: React.FC<{ 
  label: string; 
  value: number; 
  onIncrement: () => void; 
  onDecrement: () => void; 
  disabled?: boolean;
  statType: StatType;
}> = React.memo(({ label, value, onIncrement, onDecrement, disabled = false, statType }) => {
    const isAttemptedShot = statType.endsWith('A');
    const labelColor = isAttemptedShot 
      ? 'text-red-600 dark:text-red-400' 
      : 'text-gray-700 dark:text-slate-300';
    const valueColor = value < 0 
      ? 'text-red-600 dark:text-red-400' 
      : 'text-gray-900 dark:text-white';

    return (
      <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-700 rounded">
        <span className={`text-sm ${labelColor}`}>{label}</span>
        <div className="flex items-center space-x-2">
          <button onClick={onDecrement} disabled={disabled || value <= 0} className="p-1 bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-50"><MinusIcon /></button>
          <span className={`w-6 text-center ${valueColor}`}>{value}</span>
          <button onClick={onIncrement} disabled={disabled} className="p-1 bg-green-600 hover:bg-green-500 text-white rounded disabled:opacity-50"><PlusIcon /></button>
        </div>
      </div>
    );
});

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = React.memo(({
  isOpen, onClose, player, teamType, currentStats, onSaveStats, maxPersonalFouls, allowFoulOuts,
}) => {
  const [stats, setStats] = useState<PlayerStats>(currentStats);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  useEffect(() => { setStats(currentStats); }, [isOpen, currentStats]);

  const handleStatChange = useCallback((statType: StatType, increment: boolean) => {
    setStats(currentLocalStats => {
      const oldValue = currentLocalStats[statType] || 0;
      const newValue = oldValue + (increment ? 1 : -1);
      const newStatValue = Math.max(0, newValue);
      let updatedStats = { ...currentLocalStats, [statType]: newStatValue };
      if (increment) {
        if (statType === StatType.POINTS_1_MADE) updatedStats[StatType.POINTS_1_ATTEMPTED] = Math.max(updatedStats[StatType.POINTS_1_ATTEMPTED] || 0, newStatValue);
        if (statType === StatType.POINTS_2_MADE) updatedStats[StatType.POINTS_2_ATTEMPTED] = Math.max(updatedStats[StatType.POINTS_2_ATTEMPTED] || 0, newStatValue);
        if (statType === StatType.POINTS_3_MADE) updatedStats[StatType.POINTS_3_ATTEMPTED] = Math.max(updatedStats[StatType.POINTS_3_ATTEMPTED] || 0, newStatValue);
      } else {
         if (statType === StatType.POINTS_1_ATTEMPTED && newStatValue < (updatedStats[StatType.POINTS_1_MADE] || 0)) updatedStats[StatType.POINTS_1_MADE] = newStatValue;
         if (statType === StatType.POINTS_2_ATTEMPTED && newStatValue < (updatedStats[StatType.POINTS_2_MADE] || 0)) updatedStats[StatType.POINTS_2_MADE] = newStatValue;
         if (statType === StatType.POINTS_3_ATTEMPTED && newStatValue < (updatedStats[StatType.POINTS_3_MADE] || 0)) updatedStats[StatType.POINTS_3_MADE] = newStatValue;
      }
      if (allowFoulOuts && statType === StatType.FOULS_PERSONAL && newStatValue >= maxPersonalFouls) {
        if (newStatValue === maxPersonalFouls && increment) { // Only show alert on the foul that causes foul out
            setAlertInfo({isOpen: true, title: "Jugador Expulsado", message: `${player.name} ha alcanzado el máximo de ${maxPersonalFouls} faltas personales.`});
        }
      }
      return updatedStats;
    });
  }, [allowFoulOuts, maxPersonalFouls, player.name]);

  const handleSaveAndClose = useCallback(() => { onSaveStats(player, teamType, stats); onClose(); }, [player, teamType, stats, onSaveStats, onClose]);
  const handleCloseAlert = useCallback(() => setAlertInfo({ ...alertInfo, isOpen: false }), [alertInfo]);
  
  if (!isOpen) return null;

  const playerIsEffectivelyFouledOut = allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= maxPersonalFouls;

  const totalPoints = (stats[StatType.POINTS_1_MADE] || 0) + 
                      (stats[StatType.POINTS_2_MADE] || 0) * 2 + 
                      (stats[StatType.POINTS_3_MADE] || 0) * 3;
  const totalRebounds = (stats[StatType.REBOUNDS_OFFENSIVE] || 0) + 
                        (stats[StatType.REBOUNDS_DEFENSIVE] || 0);
  const totalAssists = stats[StatType.ASSISTS] || 0;
  const totalSteals = stats[StatType.STEALS] || 0;
  const totalBlocks = stats[StatType.BLOCKS] || 0;
  const totalFouls = stats[StatType.FOULS_PERSONAL] || 0;


  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Estadísticas de {player.name} (#{player.number})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white"><XMarkIcon /></button>
        </div>

        {playerIsEffectivelyFouledOut && (
            <p className="text-center p-2 my-2 bg-red-700 text-white rounded-md">
                ¡JUGADOR EXPULSADO POR FALTAS! ({stats[StatType.FOULS_PERSONAL]} PF)
            </p>
        )}
        {!allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= maxPersonalFouls && (
             <p className="text-center p-2 my-2 bg-yellow-600 text-white rounded-md">
                Jugador con {stats[StatType.FOULS_PERSONAL]} PF (Expulsiones desactivadas).
            </p>
        )}

        <div className="text-xs text-center text-gray-600 dark:text-slate-300 mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">
          Totales: {totalPoints} Pts &bull; {totalRebounds} Reb &bull; {totalAssists} Ast &bull; {totalSteals} Stl &bull; {totalBlocks} Blk &bull; {totalFouls} PF
        </div>


        <div className="overflow-y-auto mb-4 flex-grow pr-2 space-y-3">
          <div>
            <h3 className="text-md font-medium text-gray-800 dark:text-white mb-1">Puntos:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {POINTS_STATS.map(statKey => (
                <StatButton key={statKey} label={STAT_TYPE_LABELS[statKey]} value={stats[statKey] || 0}
                  onIncrement={() => handleStatChange(statKey, true)} onDecrement={() => handleStatChange(statKey, false)}
                  disabled={playerIsEffectivelyFouledOut && statKey !== StatType.FOULS_PERSONAL} statType={statKey} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-md font-medium text-gray-800 dark:text-white mb-1">Otras Estadísticas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {OTHER_STATS.map(statKey => (
                <StatButton key={statKey} label={STAT_TYPE_LABELS[statKey]} value={stats[statKey] || 0}
                  onIncrement={() => handleStatChange(statKey, true)} onDecrement={() => handleStatChange(statKey, false)}
                  disabled={playerIsEffectivelyFouledOut && statKey !== StatType.FOULS_PERSONAL} statType={statKey} />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400 rounded-md">Cancelar</button>
          <button onClick={handleSaveAndClose} className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90">Guardar Estadísticas</button>
        </div>
      </div>
    </div>
     <AlertDialog isOpen={alertInfo.isOpen} onClose={handleCloseAlert} title={alertInfo.title}> {alertInfo.message} </AlertDialog>
    </>
  );
});

export default PlayerStatsModal;
