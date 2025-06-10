
import React, { useState, useEffect } from 'react';
import { Player, Team, DialogProps } from '../types'; // Team might not be needed if not passing full team objects
import { XMarkIcon, PlusIcon } from '../utils';

interface CreateTeamWithPlayersModalProps extends Omit<DialogProps, 'title' | 'children'> {
  teamName: string; // Name for the new team
  allPlayers: Player[]; // Global roster
  allTeams: Team[]; // To check for players assigned to other teams
  onConfirm: (selectedPlayerIds: string[]) => void;
}

const CreateTeamWithPlayersModal: React.FC<CreateTeamWithPlayersModalProps> = ({
  isOpen,
  onClose,
  teamName,
  allPlayers,
  allTeams,
  onConfirm,
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayerIds(new Set()); // Reset selection when modal opens
    }
  }, [isOpen]);

  const isPlayerAssignedToAnotherTeam = (playerId: string): boolean => {
    // For a new team, a player is unavailable if they are in *any* existing team.
    return allTeams.some(
      (t) => t.playerIds.includes(playerId)
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

  const handleConfirmSelection = () => {
    onConfirm(Array.from(selectedPlayerIds));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Asignar Jugadores a "{teamName}"</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-6 flex-grow pr-1">
          {allPlayers.length === 0 ? (
            <p className="text-slate-400 text-center">No hay jugadores en la plantilla global para asignar.</p>
          ) : (
            <ul className="space-y-2">
              {allPlayers.map(player => {
                const assignedToOtherTeam = isPlayerAssignedToAnotherTeam(player.id);
                const otherTeamName = assignedToOtherTeam 
                    ? allTeams.find(t => t.playerIds.includes(player.id))?.name
                    : null;

                return (
                  <li 
                    key={player.id} 
                    className={`flex items-center justify-between p-2 rounded-md 
                                ${assignedToOtherTeam ? 'bg-slate-800 opacity-60' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    <label 
                        htmlFor={`player-create-team-${player.id}`} 
                        className={`flex-grow text-white ${assignedToOtherTeam ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        title={assignedToOtherTeam && otherTeamName ? `Jugador ya asignado a ${otherTeamName}` : `${player.name} - ${player.position || 'Sin posición'}`}
                    >
                      #{player.number} - {player.name} 
                      <span className="text-xs text-slate-400 ml-1">({player.position || 'N/P'})</span>
                      {assignedToOtherTeam && otherTeamName && (
                        <span className="block text-xs text-yellow-400">(Ya en {otherTeamName})</span>
                      )}
                    </label>
                    <input
                      type="checkbox"
                      id={`player-create-team-${player.id}`}
                      checked={selectedPlayerIds.has(player.id)}
                      onChange={() => handleTogglePlayer(player.id)}
                      disabled={assignedToOtherTeam}
                      className={`form-checkbox h-5 w-5 text-brand-accent bg-slate-600 border-slate-500 rounded focus:ring-brand-accent focus:ring-offset-brand-surface
                                  ${assignedToOtherTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
           {allPlayers.length > 0 && allPlayers.every(p => isPlayerAssignedToAnotherTeam(p.id)) && (
             <p className="text-slate-400 text-center mt-3">Todos los jugadores de la plantilla global ya están asignados a otros equipos.</p>
           )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-600">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmSelection}
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90 flex items-center"
          >
           <PlusIcon className="w-5 h-5 mr-1" /> Crear Equipo ({selectedPlayerIds.size} jug.)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamWithPlayersModal;
