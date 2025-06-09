
import React, { useState, useEffect } from 'react';
import { Player, TeamType, DialogProps } from '../types';
import { XMarkIcon, PlusIcon } from '../utils';

interface AddPlayerToGameTeamModalProps extends Omit<DialogProps, 'title' | 'children'> {
  teamType: TeamType;
  currentTeamName: string;
  playersAlreadyInGameTeam: Player[];
  globalRoster: Player[];
  onAddPlayers: (teamType: TeamType, playersToAdd: Player[]) => void;
  unavailablePlayerIds?: string[]; // New prop
}

const AddPlayerToGameTeamModal: React.FC<AddPlayerToGameTeamModalProps> = ({
  isOpen,
  onClose,
  teamType,
  currentTeamName,
  playersAlreadyInGameTeam,
  globalRoster,
  onAddPlayers,
  unavailablePlayerIds = [], // Default to empty array
}) => {
  const [selectedPlayersToAdd, setSelectedPlayersToAdd] = useState<Player[]>([]);

  const availablePlayers = globalRoster.filter(
    pGlobal => 
      !playersAlreadyInGameTeam.some(pGame => pGame.id === pGlobal.id) &&
      !unavailablePlayerIds.includes(pGlobal.id)
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayersToAdd([]); // Reset selection when modal opens
    }
  }, [isOpen]);

  const handleTogglePlayer = (player: Player) => {
    setSelectedPlayersToAdd(prev =>
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleConfirm = () => {
    if (selectedPlayersToAdd.length > 0) {
      onAddPlayers(teamType, selectedPlayersToAdd);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Añadir Jugadores a {currentTeamName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-4 flex-grow pr-2">
          {availablePlayers.length === 0 ? (
            <p className="text-slate-400 text-center">Todos los jugadores de la plantilla global ya están en este equipo, en el equipo contrario, o la plantilla está vacía.</p>
          ) : (
            <ul className="space-y-2">
              {availablePlayers.map(player => (
                <li key={player.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-md">
                  <span className="text-white">#{player.number} - {player.name} ({player.position || 'N/P'})</span>
                  <input
                    type="checkbox"
                    checked={selectedPlayersToAdd.some(p => p.id === player.id)}
                    onChange={() => handleTogglePlayer(player)}
                    className="form-checkbox h-5 w-5 text-brand-accent bg-slate-600 border-slate-500 rounded focus:ring-brand-accent"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90 flex items-center"
            disabled={selectedPlayersToAdd.length === 0}
          >
            <PlusIcon className="mr-2"/> Añadir ({selectedPlayersToAdd.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlayerToGameTeamModal;
