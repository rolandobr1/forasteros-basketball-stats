
import React, { useState, useEffect, useCallback } from 'react';
import { DialogProps, Player } from '../types';
import { XMarkIcon } from '../utils';

interface PlayerSelectionModalProps extends Omit<DialogProps, 'title'> {
  title?: string;
  roster: Player[];
  selectedPlayers: Player[];
  onConfirmSelection: (selected: Player[]) => void;
  teamName: string;
  unavailablePlayerIds?: string[];
}

const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = React.memo(({
  isOpen,
  onClose,
  roster,
  selectedPlayers,
  onConfirmSelection,
  teamName,
  unavailablePlayerIds = [],
  title = `Seleccionar Jugadores para ${teamName}`
}) => {
  const [currentSelection, setCurrentSelection] = useState<Player[]>([]);

  useEffect(() => {
    if (isOpen) { // Reset selection when modal opens based on current selectedPlayers
      setCurrentSelection(selectedPlayers);
    }
  }, [selectedPlayers, isOpen]);

  const handleTogglePlayer = useCallback((player: Player) => {
    if (unavailablePlayerIds.includes(player.id)) return;
    setCurrentSelection(prev =>
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  }, [unavailablePlayerIds]);

  const handleConfirm = useCallback(() => {
    onConfirmSelection(currentSelection);
    onClose();
  }, [onConfirmSelection, currentSelection, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-4 flex-grow pr-2">
          {roster.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 text-center">No hay jugadores en la plantilla global.</p>
          ) : (
            <ul className="space-y-2">
              {roster.map(player => {
                const isUnavailable = unavailablePlayerIds.includes(player.id);
                const isSelected = currentSelection.some(p => p.id === player.id);

                return (
                  <li 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-md 
                                ${isUnavailable 
                                  ? 'bg-gray-200 dark:bg-slate-800 opacity-60 cursor-not-allowed' 
                                  : (isSelected 
                                      ? 'bg-brand-accent/20 dark:bg-brand-accent/30' 
                                      : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600')}`}
                    onClick={isUnavailable ? undefined : () => handleTogglePlayer(player)}
                  >
                    <label 
                      htmlFor={`player-select-${player.id}`} 
                      className={`flex-grow text-gray-800 dark:text-white ${isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      #{player.number} - {player.name}
                      {isUnavailable && (
                        <span className="text-xs text-yellow-500 dark:text-yellow-400 ml-1">(En Equipo Contrario)</span>
                      )}
                    </label>
                    <input
                      type="checkbox"
                      id={`player-select-${player.id}`}
                      checked={isSelected && !isUnavailable}
                      onChange={() => handleTogglePlayer(player)}
                      disabled={isUnavailable}
                      className={`form-checkbox h-5 w-5 text-brand-accent bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-brand-accent focus:ring-offset-white dark:focus:ring-offset-brand-surface
                                  ${isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
           {roster.length > 0 && roster.every(p => unavailablePlayerIds.includes(p.id)) && (
             <p className="text-gray-500 dark:text-slate-400 text-center mt-3">Todos los jugadores de la plantilla global ya han sido asignados al equipo contrario.</p>
           )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400 rounded-md"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90"
            disabled={roster.length === 0 && currentSelection.length === 0}
          >
            Confirmar Selección ({currentSelection.length})
          </button>
        </div>
      </div>
    </div>
  );
});

export default PlayerSelectionModal;
