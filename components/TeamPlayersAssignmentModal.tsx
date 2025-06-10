
import React, { useState, useEffect } from 'react';
import { Player, Team, DialogProps } from '../types';
import { XMarkIcon } from '../utils';

interface TeamPlayersAssignmentModalProps extends Omit<DialogProps, 'title' | 'children'> {
  team: Team;
  allPlayers: Player[];
  allTeams: Team[]; 
  onAssignPlayers: (teamId: string, assignedPlayerIds: string[]) => void;
}

const TeamPlayersAssignmentModal: React.FC<TeamPlayersAssignmentModalProps> = ({
  isOpen,
  onClose,
  team,
  allPlayers,
  allTeams, 
  onAssignPlayers,
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayerIds(new Set(team.playerIds));
    }
  }, [isOpen, team.playerIds]);

  const isPlayerAssignedToAnotherTeam = (playerId: string): boolean => {
    return allTeams.some(
      (t) => t.id !== team.id && t.playerIds.includes(playerId)
    );
  };

  const handleTogglePlayer = (playerId: string) => {
    if (isPlayerAssignedToAnotherTeam(playerId)) {
      return; 
    }
    setSelectedPlayerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onAssignPlayers(team.id, Array.from(selectedPlayerIds));
    onClose();
  };

  if (!isOpen) return null;
  
  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const bgListItem = "bg-slate-100 dark:bg-slate-700";
  const hoverBgListItem = "hover:bg-slate-200 dark:hover:bg-slate-600";
  const unavailableBgListItem = "bg-slate-300 dark:bg-slate-800 opacity-60";
  const checkboxClasses = "form-checkbox h-5 w-5 text-brand-accent-light dark:text-brand-accent bg-slate-200 dark:bg-slate-600 border-brand-border-light dark:border-slate-500 rounded focus:ring-brand-accent-light dark:focus:ring-brand-accent focus:ring-offset-brand-surface-light dark:focus:ring-offset-brand-surface";
  const borderDefault = "border-brand-border-light dark:border-slate-600";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className={`${bgSurface} rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 ease-in-out scale-100 max-h-[80vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${textPrimary}`}>Asignar Jugadores a "{team.name}"</h2>
          <button onClick={onClose} className={`${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white`}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-6 flex-grow pr-1">
          {allPlayers.length === 0 ? (
            <p className={`${textSecondary} text-center`}>No hay jugadores en la plantilla global para asignar.</p>
          ) : (
            <ul className="space-y-2">
              {allPlayers.map(player => {
                const assignedToOtherTeam = isPlayerAssignedToAnotherTeam(player.id);
                const otherTeamName = assignedToOtherTeam 
                    ? allTeams.find(t => t.id !== team.id && t.playerIds.includes(player.id))?.name
                    : null;

                return (
                  <li 
                    key={player.id} 
                    className={`flex items-center justify-between p-2 rounded-md 
                                ${assignedToOtherTeam ? unavailableBgListItem : `${bgListItem} ${hoverBgListItem}`}`}
                  >
                    <label 
                        htmlFor={`player-${player.id}`} 
                        className={`flex-grow ${textPrimary} ${assignedToOtherTeam ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        title={assignedToOtherTeam && otherTeamName ? `Jugador ya asignado a ${otherTeamName}` : `${player.name} - ${player.position || 'Sin posición'}`}
                    >
                      #{player.number} - {player.name} 
                      <span className={`text-xs ${textSecondary} ml-1`}>({player.position || 'N/P'})</span>
                      {assignedToOtherTeam && otherTeamName && (
                        <span className="block text-xs text-yellow-500 dark:text-yellow-400">(Ya en {otherTeamName})</span>
                      )}
                    </label>
                    <input
                      type="checkbox"
                      id={`player-${player.id}`}
                      checked={selectedPlayerIds.has(player.id)}
                      onChange={() => handleTogglePlayer(player.id)}
                      disabled={assignedToOtherTeam}
                      className={`${checkboxClasses} ${assignedToOtherTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <div className={`flex justify-end space-x-3 pt-4 border-t ${borderDefault}`}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-button-light dark:bg-slate-500 text-brand-text-primary-light dark:text-white rounded-md hover:bg-brand-button-hover-light dark:hover:bg-slate-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-brand-accent-light dark:bg-brand-accent text-white rounded-md hover:bg-opacity-90"
          >
            Guardar Cambios ({selectedPlayerIds.size} jugadores)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamPlayersAssignmentModal;
