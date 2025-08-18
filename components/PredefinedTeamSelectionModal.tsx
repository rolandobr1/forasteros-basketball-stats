
import React, { useCallback } from 'react';
import { Team, PredefinedTeamSelectionModalProps } from '../types';
import { XMarkIcon, CheckCircleIcon } from '../utils';

const PredefinedTeamSelectionModal: React.FC<PredefinedTeamSelectionModalProps> = React.memo(({
  isOpen,
  onClose,
  allTeams,
  onTeamSelected,
  currentSelectedTeamId,
  title = "Seleccionar Equipo Predefinido"
}) => {
  if (!isOpen) return null;

  const handleSelectTeam = useCallback((team: Team) => {
    onTeamSelected(team);
    onClose();
  }, [onTeamSelected, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white"
            aria-label="Cerrar modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto mb-6 flex-grow pr-1">
          {allTeams.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 text-center">No hay equipos predefinidos disponibles.</p>
          ) : (
            <ul className="space-y-2">
              {allTeams.map(team => (
                <li key={team.id}>
                  <button
                    onClick={() => handleSelectTeam(team)}
                    className={`w-full text-left p-3 rounded-md flex items-center justify-between
                                ${currentSelectedTeamId === team.id 
                                  ? 'bg-brand-accent/20 dark:bg-brand-accent/30 ring-2 ring-brand-accent' 
                                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                  >
                    <span className="text-gray-800 dark:text-white">{team.name} ({team.playerIds.length} jugadores)</span>
                    {currentSelectedTeamId === team.id && <CheckCircleIcon className="w-5 h-5 text-brand-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-600">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400 rounded-md"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
});

export default PredefinedTeamSelectionModal;
