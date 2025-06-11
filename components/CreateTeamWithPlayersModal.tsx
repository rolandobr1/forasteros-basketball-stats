
import React, { useState, useEffect, useCallback } from 'react';
import { Player, Team, DialogProps } from '../types';
import { XMarkIcon, PlusIcon } from '../utils';

interface CreateTeamWithPlayersModalProps extends Omit<DialogProps, 'title' | 'children'> {
  teamName: string;
  allPlayers: Player[];
  allTeams: Team[];
  onConfirm: (selectedPlayerIds: string[]) => void;
}

const CreateTeamWithPlayersModal: React.FC<CreateTeamWithPlayersModalProps> = React.memo(({
  isOpen, onClose, teamName, allPlayers, allTeams, onConfirm,
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (isOpen) setSelectedPlayerIds(new Set()); }, [isOpen]);

  const isPlayerAssignedToAnotherTeam = useCallback((playerId: string): boolean => {
    return allTeams.some(t => t.playerIds.includes(playerId));
  }, [allTeams]);

  const handleTogglePlayer = useCallback((playerId: string) => {
    if (isPlayerAssignedToAnotherTeam(playerId)) return;
    setSelectedPlayerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) newSet.delete(playerId); else newSet.add(playerId);
      return newSet;
    });
  }, [isPlayerAssignedToAnotherTeam]);

  const handleConfirmSelection = useCallback(() => { onConfirm(Array.from(selectedPlayerIds)); onClose(); }, [onConfirm, selectedPlayerIds, onClose]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Asignar Jugadores a "{teamName}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-6 flex-grow pr-1">
          {allPlayers.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 text-center">No hay jugadores en la plantilla global.</p>
          ) : (
            <ul className="space-y-2">
              {allPlayers.map(player => {
                const assignedToOtherTeam = isPlayerAssignedToAnotherTeam(player.id);
                const otherTeamName = assignedToOtherTeam ? allTeams.find(t => t.playerIds.includes(player.id))?.name : null;
                return (
                  <li key={player.id} 
                    className={`flex items-center justify-between p-2 rounded-md 
                                ${assignedToOtherTeam 
                                  ? 'bg-gray-200 dark:bg-slate-800 opacity-60' 
                                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    <label htmlFor={`player-create-team-${player.id}`} 
                      className={`flex-grow text-gray-800 dark:text-white ${assignedToOtherTeam ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      title={assignedToOtherTeam && otherTeamName ? `Jugador ya asignado a ${otherTeamName}` : `${player.name} - ${player.position || 'Sin posición'}`}>
                      #{player.number} - {player.name} 
                      <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">({player.position || 'N/P'})</span>
                      {assignedToOtherTeam && otherTeamName && <span className="block text-xs text-yellow-500 dark:text-yellow-400">(Ya en {otherTeamName})</span>}
                    </label>
                    <input type="checkbox" id={`player-create-team-${player.id}`} checked={selectedPlayerIds.has(player.id)}
                      onChange={() => handleTogglePlayer(player.id)} disabled={assignedToOtherTeam}
                      className={`form-checkbox h-5 w-5 text-brand-accent bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-brand-accent focus:ring-offset-white dark:focus:ring-offset-brand-surface
                                  ${assignedToOtherTeam ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </li>
                );
              })}
            </ul>
          )}
           {allPlayers.length > 0 && allPlayers.every(p => isPlayerAssignedToAnotherTeam(p.id)) && (
             <p className="text-gray-500 dark:text-slate-400 text-center mt-3">Todos los jugadores de la plantilla global ya están asignados a otros equipos.</p>
           )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-600">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400 rounded-md">
            Cancelar
          </button>
          <button onClick={handleConfirmSelection} className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90 flex items-center">
           <PlusIcon className="w-5 h-5 mr-1" /> Crear Equipo ({selectedPlayerIds.size} jug.)
          </button>
        </div>
      </div>
    </div>
  );
});

export default CreateTeamWithPlayersModal;
