
import React from 'react';
import { TeamGameInfo, GameSettings } from '../types';

interface TeamDisplayProps {
  team: TeamGameInfo;
  gameSettings: GameSettings;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({ team, gameSettings }) => {
  const isInBonus = team.foulsThisQuarter >= gameSettings.foulsForBonus;

  return (
    <div className="bg-brand-surface p-4 rounded-lg shadow-md text-center">
      <h3 className="text-xl font-bold text-white truncate mb-2" title={team.name}>{team.name}</h3>
      <p className="text-4xl font-extrabold text-brand-accent mb-2">{team.score}</p>
      <div className="text-sm text-slate-300">
        <p>Faltas Q: {team.foulsThisQuarter}</p>
        {isInBonus && <p className="text-red-400 font-semibold">EN BONUS</p>}
        {/* <p>Tiempos Muertos: {team.timeoutsLeft}</p> */}
      </div>
    </div>
  );
};

export default TeamDisplay;