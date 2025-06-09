import React, { useState } from 'react';
import { Player, TeamGameInfo, TeamType, DialogProps } from '../types';
import { XMarkIcon, ArrowPathIcon } from '../utils';

interface SubstitutionModalProps extends Omit<DialogProps, 'title'> {
  title?: string; // Made title optional to allow default value to be used
  team: TeamGameInfo;
  teamType: TeamType; // 'home' or 'away'
  onConfirmSubstitution: (teamType: TeamType, playerIn: Player, playerOut: Player) => void;
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  team,
  teamType,
  onConfirmSubstitution,
  title = `Sustitución - ${team.name}` // Default title
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XMarkIcon /></button>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 pr-2 grid md:grid-cols-2 gap-4">
          {/* Players on Court (to select player OUT) */}
          <div>
            <h3 className="text-md font-medium text-white mb-2">Sale de Cancha:</h3>
            {team.onCourt.length === 0 ? <p className="text-slate-400 text-sm">Nadie en cancha.</p> : (
              <ul className="space-y-2">
                {team.onCourt.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => setPlayerOut(p)}
                      className={`w-full text-left p-2 rounded ${playerOut?.id === p.id ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                    >
                      #{p.number} {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Players on Bench (to select player IN) */}
          <div>
            <h3 className="text-md font-medium text-white mb-2">Entra a Cancha:</h3>
             {team.bench.length === 0 ? <p className="text-slate-400 text-sm">Banca vacía.</p> : (
                <ul className="space-y-2">
                {team.bench.map(p => (
                    <li key={p.id}>
                    <button
                        onClick={() => setPlayerIn(p)}
                        className={`w-full text-left p-2 rounded ${playerIn?.id === p.id ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
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
            {playerOut && <span className="text-red-400">Sale: {playerOut.name}</span>}
            {playerOut && playerIn && <ArrowPathIcon className="w-5 h-5 mx-3 text-slate-400" />}
            {playerIn && <span className="text-green-400">Entra: {playerIn.name}</span>}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-400">Cancelar</button>
          <button 
            onClick={handleConfirm} 
            disabled={!playerIn || !playerOut}
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
          >
            Confirmar Sustitución
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionModal;
