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
  onSaveStats: (playerId: string, teamType: TeamType, newStats: PlayerStats) => void;
  maxPersonalFouls: number;
  allowFoulOuts: boolean;
  openMode?: 'auto' | 'persistent'; // Default will be 'auto'
}

const StatButton: React.FC<{ 
  label: string; 
  value: number; 
  onIncrement: () => void; 
  onDecrement: () => void; 
  disabled?: boolean;
  statType: StatType; // Added to determine if it's an attempted shot
}> = 
  ({ label, value, onIncrement, onDecrement, disabled = false, statType }) => {
    const isAttemptedShot = statType.endsWith('A'); // e.g., "1PA", "2PA", "3PA"
    const labelColor = isAttemptedShot ? 'text-red-400' : 'text-slate-300';
    const valueColor = value < 0 ? 'text-red-400' : 'text-white'; // For potential negative values

    return (
      <div className="flex items-center justify-between p-2 bg-slate-700 rounded">
        <span className={`text-sm ${labelColor}`}>{label}</span>
        <div className="flex items-center space-x-2">
          <button onClick={onDecrement} disabled={disabled || value <= 0} className="p-1 bg-red-600 hover:bg-red-500 rounded disabled:opacity-50"><MinusIcon /></button>
          <span className={`w-6 text-center ${valueColor}`}>{value}</span>
          <button onClick={onIncrement} disabled={disabled} className="p-1 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50"><PlusIcon /></button>
        </div>
      </div>
    );
};

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  isOpen,
  onClose,
  player,
  teamType,
  currentStats,
  onSaveStats,
  maxPersonalFouls,
  allowFoulOuts,
  openMode = 'auto', // Default to 'auto' for auto-save behavior
}) => {
  const [stats, setStats] = useState<PlayerStats>(currentStats);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    setStats(currentStats);
  }, [isOpen, currentStats]);

  const handleStatChange = useCallback((statType: StatType, increment: boolean) => {
    const newLocalStats = (currentLocalStats: PlayerStats) => {
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
        if (newStatValue === maxPersonalFouls && increment) {
            setAlertInfo({isOpen: true, title: "Jugador Expulsado", message: `${player.name} ha alcanzado el máximo de ${maxPersonalFouls} faltas personales.`});
        }
      }
      return updatedStats;
    };

    setStats(prevLocalStats => {
        const resultingStats = newLocalStats(prevLocalStats);
        if (openMode === 'auto') {
            onSaveStats(player.id, teamType, resultingStats);
            onClose(); 
        }
        return resultingStats;
    });

  }, [player.id, teamType, onSaveStats, onClose, openMode, allowFoulOuts, maxPersonalFouls, player.name]);

  const handleSavePersistentMode = () => {
    onSaveStats(player.id, teamType, stats);
    onClose();
  };

  if (!isOpen) return null;
  
  const playerIsEffectivelyFouledOut = allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= maxPersonalFouls;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Estadísticas de {player.name} (#{player.number})</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XMarkIcon /></button>
        </div>

        {playerIsEffectivelyFouledOut && (
            <p className="text-center p-2 mb-2 bg-red-700 text-white rounded-md">
                ¡JUGADOR EXPULSADO POR FALTAS! ({stats[StatType.FOULS_PERSONAL]} PF)
            </p>
        )}
        {!allowFoulOuts && (stats[StatType.FOULS_PERSONAL] || 0) >= maxPersonalFouls && (
             <p className="text-center p-2 mb-2 bg-yellow-600 text-white rounded-md">
                Jugador con {stats[StatType.FOULS_PERSONAL]} PF (Expulsiones desactivadas).
            </p>
        )}

        <div className="overflow-y-auto mb-4 flex-grow pr-2 space-y-3">
          <div>
            <h3 className="text-md font-medium text-brand-accent mb-1">Puntos:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {POINTS_STATS.map(statKey => (
                <StatButton
                  key={statKey}
                  label={STAT_TYPE_LABELS[statKey]}
                  value={stats[statKey] || 0}
                  onIncrement={() => handleStatChange(statKey, true)}
                  onDecrement={() => handleStatChange(statKey, false)}
                  disabled={playerIsEffectivelyFouledOut && statKey !== StatType.FOULS_PERSONAL}
                  statType={statKey}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-md font-medium text-brand-accent mb-1">Otras Estadísticas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {OTHER_STATS.map(statKey => (
                <StatButton
                  key={statKey}
                  label={STAT_TYPE_LABELS[statKey]}
                  value={stats[statKey] || 0}
                  onIncrement={() => handleStatChange(statKey, true)}
                  onDecrement={() => handleStatChange(statKey, false)}
                  disabled={playerIsEffectivelyFouledOut && statKey !== StatType.FOULS_PERSONAL}
                  statType={statKey}
                />
              ))}
            </div>
          </div>
        </div>
        
        {openMode === 'persistent' && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button onClick={onClose} className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-400">Cancelar</button>
            <button onClick={handleSavePersistentMode} className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90">Guardar Estadísticas</button>
          </div>
        )}
      </div>
    </div>
     <AlertDialog
        isOpen={alertInfo.isOpen}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
        title={alertInfo.title}
      >
        {alertInfo.message}
      </AlertDialog>
    </>
  );
};

export default PlayerStatsModal;