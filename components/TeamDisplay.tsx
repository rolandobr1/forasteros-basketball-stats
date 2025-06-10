
import React from 'react';
import { TeamGameInfo, GameSettings } from '../types';

interface TeamDisplayProps {
  team: TeamGameInfo;
  gameSettings: GameSettings;
  opponentFoulsThisQuarter: number; 
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({ team, gameSettings, opponentFoulsThisQuarter }) => {
  const isInBonus = opponentFoulsThisQuarter >= gameSettings.foulsForBonus;
  
  const textPrimary = "text-brand-text-primary-light dark:text-brand-text-primary";
  const textScore = "text-yellow-500 dark:text-yellow-400"; // Adjusted for better contrast in both modes
  const textSecondary = "text-brand-text-secondary-light dark:text-slate-300";
  const bgSurface = "bg-brand-surface-light dark:bg-brand-surface";

  return (
    <div className={`${bgSurface} p-4 rounded-lg shadow-md text-center`}>
      <h3 className={`text-xl font-bold ${textPrimary} truncate mb-2`} title={team.name}>{team.name}</h3>
      <p className={`text-4xl font-extrabold ${textScore} mb-2`}>{team.score}</p>
      <div className={`text-sm ${textSecondary}`}>
        <p>Faltas Equipo: {team.foulsThisQuarter}</p>
        {isInBonus && <p className="text-green-500 dark:text-green-400 font-semibold">EN BONUS</p>}
      </div>
    </div>
  );
};

export default TeamDisplay;
