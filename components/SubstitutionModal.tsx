
import React, { useState, useCallback } from 'react';
import { Player, TeamGameInfo, TeamType, DialogProps } from '../types';
import { XMarkIcon, ArrowPathIcon } from '../utils';

interface SubstitutionModalProps extends Omit<DialogProps, 'title'> {
  title?: string;
  team: TeamGameInfo;
  teamType: TeamType;
  onConfirmSubstitution: (teamType: TeamType, playerIn: Player, playerOut: Player) => void;
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = React.memo(({
  isOpen, onClose, team, teamType, onConfirmSubstitution, title = `Sustitución - ${team.name}`
}) => {
  const [playerOut, setPlayerOut] = useState<Player | null>(null);
  const [playerIn, setPlayerIn] = useState<Player | null>(null);

  const handleConfirm = useCallback(() => {
    if (playerIn && playerOut) {
      onConfirmSubstitution(teamType, playerIn, playerOut);
      setPlayerIn(null); setPlayerOut(null); onClose();
    } else {
      alert("Selecciona un jugador para entrar y otro para salir."); // Consider replacing alert with a non-blocking UI message
    }
  }, [playerIn, playerOut, onConfirmSubstitution, teamType, onClose]);

  if (!isOpen) return null;

  const buttonBaseClass = "w-full text-left p-2 rounded";
  const selectedOutClass = "bg-red-600 text-white ring-2 ring-red-400";
  const selectedInClass = "bg-green-600 text-white ring-2 ring-green-400";
  const normalClass = "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200";
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white"><XMarkIcon /></button>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 pr-2 grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-md font-medium text-gray-800 dark:text-white mb-2">Sale de Cancha:</h3>
            {team.onCourt.length === 0 ? <p className="text-gray-500 dark:text-slate-400 text-sm">Nadie en cancha.</p> : (
              <ul className="space-y-2">
                {team.onCourt.map(p => (
                  <li key={p.id}>
                    <button onClick={() => setPlayerOut(p)}
                      className={`${buttonBaseClass} ${playerOut?.id === p.id ? selectedOutClass : normalClass}`}>
                      #{p.number} {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-md font-medium text-gray-800 dark:text-white mb-2">Entra a Cancha:</h3>
             {team.bench.length === 0 ? <p className="text-gray-500 dark:text-slate-400 text-sm">Banca vacía.</p> : (
                <ul className="space-y-2">
                {team.bench.map(p => (
                    <li key={p.id}>
                    <button onClick={() => setPlayerIn(p)}
                        className={`${buttonBaseClass} ${playerIn?.id === p.id ? selectedInClass : normalClass}`}>
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
            {playerOut && playerIn && <ArrowPathIcon className="w-5 h-5 mx-3 text-gray-500 dark:text-slate-400" />}
            {playerIn && <span className="text-green-500 dark:text-green-400">Entra: {playerIn.name}</span>}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400 rounded-md">Cancelar</button>
          <button onClick={handleConfirm} disabled={!playerIn || !playerOut}
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90 disabled:opacity-50">
            Confirmar Sustitución
          </button>
        </div>
      </div>
    </div>
  );
});

export default SubstitutionModal;
