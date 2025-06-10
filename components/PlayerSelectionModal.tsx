

import React, { useState, useEffect } from 'react';
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

const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
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
    setCurrentSelection(selectedPlayers);
  }, [selectedPlayers, isOpen]); 

  const handleTogglePlayer = (player: Player) => {
    if (unavailablePlayerIds.includes(player.id)) {
      return;
    }
    setCurrentSelection(prev =>
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleConfirm = () => {
    onConfirmSelection(currentSelection);
    onClose();
  };

  if (!isOpen) return null;

  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const bgListItem = "bg-slate-100 dark:bg-slate-700";
  const hoverBgListItem = "hover:bg-slate-200 dark:hover:bg-slate-600";
  const selectedBgListItem = "bg-brand-accent-light/30 dark:bg-brand-accent/30";
  const unavailableBgListItem = "bg-slate-300 dark:bg-slate-800 opacity-60 cursor-not-allowed";
  const checkboxClasses = "form-checkbox h-5 w-5 text-brand-accent-light dark:text-brand-accent bg-slate-200 dark:bg-slate-600 border-brand-border-light dark:border-slate-500 rounded focus:ring-brand-accent-light dark:focus:ring-brand-accent focus:ring-offset-brand-surface-light dark:focus:ring-offset-brand-surface";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className={`${bgSurface} rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${textPrimary}`}>{title}</h2>
          <button onClick={onClose} className={`${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white`}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-4 flex-grow pr-2">
          {roster.length === 0 ? (
            <p className={`${textSecondary} text-center`}>No hay jugadores en la plantilla global. Añade jugadores en la sección "Gestionar Jugadores".</p>
          ) : (
            <ul className="space-y-2">
              {roster.map(player => {
                const isUnavailable = unavailablePlayerIds.includes(player.id);
                const isSelected = currentSelection.some(p => p.id === player.id);

                return (
                  <li 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-md 
                                ${isUnavailable ? unavailableBgListItem 
                                               : (isSelected ? selectedBgListItem : `${bgListItem} ${hoverBgListItem}`)}`}
                    onClick={isUnavailable ? undefined : () => handleTogglePlayer(player)}
                  >
                    <label 
                      htmlFor={`player-select-${player.id}`} 
                      className={`flex-grow ${textPrimary} ${isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                      className={`${checkboxClasses} ${isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
           {roster.length > 0 && roster.every(p => unavailablePlayerIds.includes(p.id)) && (
             <p className={`${textSecondary} text-center mt-3`}>Todos los jugadores de la plantilla global ya han sido asignados al equipo contrario.</p>
           )}
        </div>
        
        <div className={`flex justify-end space-x-3 pt-4 border-t border-brand-border-light dark:border-slate-700`}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-button-light dark:bg-slate-500 text-brand-text-primary-light dark:text-white rounded-md hover:bg-brand-button-hover-light dark:hover:bg-slate-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-brand-accent-light dark:bg-brand-accent text-white rounded-md hover:bg-opacity-90"
            disabled={roster.length === 0 && currentSelection.length === 0}
          >
            Confirmar Selección ({currentSelection.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerSelectionModal;
