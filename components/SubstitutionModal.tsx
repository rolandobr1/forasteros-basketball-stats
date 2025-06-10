
import React, { useState } from 'react';
import { Player, TeamGameInfo, TeamType, DialogProps } from '../types';
import { XMarkIcon, ArrowPathIcon } from '../utils';

interface SubstitutionModalProps extends Omit<DialogProps, 'title'> {
  title?: string; 
  team: TeamGameInfo;
  teamType: TeamType; 
  onConfirmSubstitution: (teamType: TeamType, playerIn: Player, playerOut: Player) => void;
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  team,
  teamType,
  onConfirmSubstitution,
  title = `Sustitución - ${team.name}` 
}) => {
  const [playerOut, setPlayerOut] = useState<Player | null>(null);
  const [playerIn, setPlayerIn] = useState<Player | null>(null);

  const handleConfirm = () => {
    if (playerIn && playerOut) {
      onConfirmSubstitution(teamType, playerIn, playerOut);
      setPlayerIn(null);
      setPlayerOut(null);
      onClose();
    } else {
      alert("Selecciona un jugador para entrar y otro para salir.");
    }
  };

  if (!isOpen) return null;

  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-400";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";
  const bgListItem = "bg-slate-200 dark:bg-slate-700";
  const hoverBgListItem = "hover:bg-slate-300 dark:hover:bg-slate-600";
  const borderDefault = "border-brand-border-light dark:border-slate-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className={`${bgSurface} rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${textPrimary}`}>{title}</h2>
          <button onClick={onClose} className={`${textSecondary} hover:text-brand-text-primary-light dark:hover:text-white`}><XMarkIcon /></button>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 pr-2 grid md:grid-cols-2 gap-4">
          <div>
            <h3 className={`text-md font-medium ${textPrimary} mb-2`}>Sale de Cancha:</h3>
            {team.onCourt.length === 0 ? <p className={`${textSecondary} text-sm`}>Nadie en cancha.</p> : (
              <ul className="space-y-2">
                {team.onCourt.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => setPlayerOut(p)}
                      className={`w-full text-left p-2 rounded ${playerOut?.id === p.id ? 'bg-red-600 text-white ring-2 ring-red-400' : `${bgListItem} ${hoverBgListItem} ${textSecondary} dark:text-slate-200`}`}
                    >
                      #{p.number} {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className={`text-md font-medium ${textPrimary} mb-2`}>Entra a Cancha:</h3>
             {team.bench.length === 0 ? <p className={`${textSecondary} text-sm`}>Banca vacía.</p> : (
                <ul className="space-y-2">
                {team.bench.map(p => (
                    <li key={p.id}>
                    <button
                        onClick={() => setPlayerIn(p)}
                        className={`w-full text-left p-2 rounded ${playerIn?.id === p.id ? 'bg-green-600 text-white ring-2 ring-green-400' : `${bgListItem} ${hoverBgListItem} ${textSecondary} dark:text-slate-200`}`}
                    >
                        #{p.number} {p.name}
                    </button>
                    </li>
                ))}
                </ul>
             )}
          </div>
        </div>
        
        <div className="flex items-center justify-center my-3">
            {playerOut && <span className="text-red-500 dark:text-red-400">Sale: {playerOut.name}</span>}
            {playerOut && playerIn && <ArrowPathIcon className={`w-5 h-5 mx-3 ${textSecondary}`} />}
            {playerIn && <span className="text-green-500 dark:text-green-400">Entra: {playerIn.name}</span>}
        </div>

        <div className={`flex justify-end space-x-3 pt-4 border-t ${borderDefault}`}>
          <button onClick={onClose} className="px-4 py-2 bg-brand-button-light dark:bg-slate-500 text-brand-text-primary-light dark:text-white rounded-md hover:bg-brand-button-hover-light dark:hover:bg-slate-400">Cancelar</button>
          <button 
            onClick={handleConfirm} 
            disabled={!playerIn || !playerOut}
            className="px-4 py-2 bg-brand-accent-light dark:bg-brand-accent text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
          >
            Confirmar Sustitución
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionModal;
