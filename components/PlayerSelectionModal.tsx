
import React, { useState, useEffect } from 'react';
import { DialogProps, Player } from '../types';
import { XMarkIcon } from '../utils';

interface PlayerSelectionModalProps extends Omit<DialogProps, 'title'> {
  title?: string; // Made title optional to allow default value to be used
  roster: Player[];
  selectedPlayers: Player[];
  onConfirmSelection: (selected: Player[]) => void;
  teamName: string;
  unavailablePlayerIds?: string[]; // New prop
}

const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  isOpen,
  onClose,
  roster,
  selectedPlayers,
  onConfirmSelection,
  teamName,
  unavailablePlayerIds = [], // Default to empty array
  title = `Seleccionar Jugadores para ${teamName}` // Default title
}) => {
  const [currentSelection, setCurrentSelection] = useState<Player[]>([]);

  useEffect(() => {
    // Initialize current selection with already selected players
    setCurrentSelection(selectedPlayers);
  }, [selectedPlayers, isOpen]); // Re-init if modal opens or selectedPlayers prop changes

  const handleTogglePlayer = (player: Player) => {
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

  const rosterToDisplay = roster.filter(
    player => !unavailablePlayerIds.includes(player.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-4 flex-grow pr-2">
          {rosterToDisplay.length === 0 ? (
            <p className="text-slate-400">{unavailablePlayerIds.length > 0 && roster.length > 0 ? "Todos los jugadores disponibles ya están en el equipo contrario o no hay más jugadores en la plantilla." : "No hay jugadores en la plantilla global. Añade jugadores en la sección \"Plantilla\"."}</p>
          ) : (
            <ul className="space-y-2">
              {rosterToDisplay.map(player => (
                <li key={player.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-md">
                  <span className="text-white">#{player.number} - {player.name}</span>
                  <input
                    type="checkbox"
                    checked={currentSelection.some(p => p.id === player.id)}
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
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90"
            disabled={rosterToDisplay.length === 0 && currentSelection.length === 0}
          >
            Confirmar Selección ({currentSelection.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerSelectionModal;
