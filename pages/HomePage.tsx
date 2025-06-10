
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BasketballIcon, ClockIcon, UsersIcon, RestartIcon } from '../utils'; // Added RestartIcon
import { Game, GamePhase } from '../types';
import { TEAM_PLACEHOLDER_LOGO } from '../constants';

interface HomePageProps {
  currentGame: Game | null;
}

const HomePage: React.FC<HomePageProps> = ({ currentGame }) => {
  const navigate = useNavigate();

  const handleResumeGame = () => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
      navigate('/game');
    }
  };

  const baseButtonClasses = "w-full max-w-md text-brand-text-primary-light dark:text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-opacity-75 flex items-center justify-between";
  const buttonTextSubClass = "text-slate-700 dark:text-slate-300"; // For paragraph text

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8">
      <img 
        src={TEAM_PLACEHOLDER_LOGO} 
        alt="Forasteros BBC Logo" 
        className="w-48 h-48 md:w-56 md:h-56" 
      />
      
      {currentGame && currentGame.gamePhase !== GamePhase.FINISHED && (
        <button
          onClick={handleResumeGame}
          className={`${baseButtonClasses} bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 focus:ring-2 focus:ring-green-300 border-2 border-green-400 hover:border-green-300 text-white`}
        >
          <div>
            <h2 className="text-xl">Reanudar Partido</h2>
            <p className="text-sm text-green-100">Continuar con el partido en curso.</p>
          </div>
          <RestartIcon className="w-8 h-8" />
        </button>
      )}

      <Link
        to="/setup"
        className={`${baseButtonClasses} bg-brand-surface-light dark:bg-gradient-to-br dark:from-brand-surface dark:to-slate-700 hover:bg-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent border-2 border-brand-border-light dark:border-slate-500 hover:border-brand-accent-light dark:hover:border-slate-400`}
      >
        <div>
          <h2 className="text-xl">Nuevo Partido</h2>
          <p className={`text-sm ${buttonTextSubClass}`}>Configura y empieza un nuevo partido.</p>
        </div>
        <BasketballIcon className="w-8 h-8" />
      </Link>

      <Link
        to="/history"
        className={`${baseButtonClasses} bg-brand-surface-light dark:bg-gradient-to-br dark:from-brand-surface dark:to-slate-700 hover:bg-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent border-2 border-brand-border-light dark:border-slate-500 hover:border-brand-accent-light dark:hover:border-slate-400`}
      >
        <div>
          <h2 className="text-xl">Historial de Partidos</h2>
          <p className={`text-sm ${buttonTextSubClass}`}>Revisa estadísticas de partidos anteriores.</p>
        </div>
        <ClockIcon className="w-8 h-8" />
      </Link>

      <Link
        to="/roster"
        className={`${baseButtonClasses} bg-brand-surface-light dark:bg-gradient-to-br dark:from-brand-surface dark:to-slate-700 hover:bg-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent border-2 border-brand-border-light dark:border-slate-500 hover:border-brand-accent-light dark:hover:border-slate-400`}
      >
        <div>
          <h2 className="text-xl">Gestionar Jugadores</h2>
          <p className={`text-sm ${buttonTextSubClass}`}>Crea y edita tus plantillas de jugadores.</p>
        </div>
        <UsersIcon className="w-8 h-8" />
      </Link>
    </div>
  );
};


export default HomePage;
