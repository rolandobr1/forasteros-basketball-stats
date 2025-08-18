
import React from 'react';
import { TeamGameInfo, GameSettings } from '../types';

interface TeamDisplayProps {
  team: TeamGameInfo;
  gameSettings: GameSettings;
  opponentFoulsThisQuarter: number;
}

const TeamDisplay: React.FC<TeamDisplayProps> = React.memo(({ team, gameSettings, opponentFoulsThisQuarter }) => {
  const isInBonus = opponentFoulsThisQuarter >= gameSettings.foulsForBonus;

  return (
    <div className="bg-white dark:bg-brand-surface p-4 rounded-lg shadow-md text-center">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate mb-2" title={team.name}>{team.name}</h3>
      <p className="text-4xl font-extrabold text-yellow-500 dark:text-yellow-400 mb-2">{team.score}</p>
      <div className="text-sm text-gray-600 dark:text-slate-300">
        <p>Faltas Equipo: {team.foulsThisQuarter}</p>
        {isInBonus && <p className="text-green-500 dark:text-green-400 font-semibold">EN BONUS</p>}
      </div>
    </div>
  );
});

export default TeamDisplay;
