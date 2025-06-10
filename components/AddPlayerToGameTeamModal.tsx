
import React, { useState, useEffect } from 'react';
import { Player, TeamType, DialogProps } from '../types';
import { XMarkIcon, PlusIcon } from '../utils';

interface AddPlayerToGameTeamModalProps extends Omit<DialogProps, 'title' | 'children'> {
  teamType: TeamType;
  currentTeamName: string;
  playersAlreadyInGameTeam: Player[];
  globalRoster: Player[];
  onAddPlayers: (teamType: TeamType, playersToAdd: Player[]) => void;
  unavailablePlayerIds?: string[];
}

const AddPlayerToGameTeamModal: React.FC<AddPlayerToGameTeamModalProps> = ({
  isOpen,
  onClose,
  teamType,
  currentTeamName,
  playersAlreadyInGameTeam,
  globalRoster,
  onAddPlayers,
  unavailablePlayerIds = [],
}) => {
  const [selectedPlayersToAdd, setSelectedPlayersToAdd] = useState<Player[]>([]);

  const availablePlayers = globalRoster.filter(
    pGlobal =>
      !playersAlreadyInGameTeam.some(pGame => pGame.id === pGlobal.id) &&
      !unavailablePlayerIds.includes(pGlobal.id)
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayersToAdd([]);
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

  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const bgListItem = "bg-slate-100 dark:bg-slate-700";
  const checkboxClasses = "form-checkbox h-5 w-5 text-brand-accent-light dark:text-brand-accent bg-slate-200 dark:bg-slate-600 border-brand-border-light dark:border-slate-500 rounded focus:ring-brand-accent-light dark:focus:ring-brand-accent focus:ring-offset-brand-surface-light dark:focus:ring-offset-brand-surface";
  const borderDefault = "border-brand-border-light dark:border-slate-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className={`${bgSurface} rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${textPrimary}`}>Añadir Jugadores a {currentTeamName}</h2>
          <button onClick={onClose} className={`${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white`}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-4 flex-grow pr-2">
          {availablePlayers.length === 0 ? (
            <p className={`${textSecondary} text-center`}>Todos los jugadores de la plantilla global ya están en este equipo, en el equipo contrario, o la plantilla está vacía.</p>
          ) : (
            <ul className="space-y-2">
              {availablePlayers.map(player => (
                <li key={player.id} className={`flex items-center justify-between p-3 ${bgListItem} rounded-md`}>
                  <span className={`${textPrimary}`}>#{player.number} - {player.name} ({player.position || 'N/P'})</span>
                  <input
                    type="checkbox"
                    checked={selectedPlayersToAdd.some(p => p.id === player.id)}
                    onChange={() => handleTogglePlayer(player)}
                    className={checkboxClasses}
                  />
                </li>
              ))}
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
            className="px-4 py-2 bg-brand-accent-light dark:bg-brand-accent text-white rounded-md hover:bg-opacity-90 flex items-center"
            disabled={selectedPlayersToAdd.length === 0}
          >
           <PlusIcon className="w-5 h-5 mr-1" /> Añadir ({selectedPlayersToAdd.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlayerToGameTeamModal;
