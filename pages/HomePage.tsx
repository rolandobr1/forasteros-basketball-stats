
import React, { useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BasketballIcon, ClockIcon, UsersIcon, RestartIcon, ImportIcon } from '../utils'; // Added ImportIcon
import { Game, GamePhase } from '../types';
import { TEAM_PLACEHOLDER_LOGO } from '../constants';

interface HomePageProps {
  currentGame: Game | null;
  onImportGames: (gamesToImportData: string) => void; // Added prop for import
}

const HomePage: React.FC<HomePageProps> = React.memo(({ currentGame, onImportGames }) => {
  const navigate = useNavigate();
  const gameImportRef = useRef<HTMLInputElement>(null);

  const handleResumeGame = useCallback(() => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
      navigate('/game');
    }
  }, [currentGame, navigate]);

  const handleGameImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        onImportGames(fileContent); // Call the prop function from App.tsx
      } catch (error) {
        console.error("Error processing imported file on HomePage:", error);
        // Alert will be handled by onImportGames in App.tsx
      }
      if (gameImportRef.current) gameImportRef.current.value = ""; // Reset file input
    };
    reader.onerror = () => {
        // Alert will be handled by onImportGames in App.tsx if it sets an error state
        console.error("Error reading file on HomePage");
        if (gameImportRef.current) gameImportRef.current.value = "";
    };
    reader.readAsText(file);
  }, [onImportGames]);

  const baseButtonClasses = "w-full max-w-md font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-opacity-75 flex items-center justify-between";
  const lightButtonClasses = "bg-white text-gray-800 hover:bg-gray-50 focus:ring-2 focus:ring-brand-accent";
  const darkButtonClasses = "dark:bg-gradient-to-br dark:from-brand-surface dark:to-slate-700 dark:text-white dark:hover:from-slate-600 dark:to-slate-800 dark:focus:ring-2 dark:focus:ring-brand-accent";


  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center justify-center space-y-8 py-8">
        <img 
          src={TEAM_PLACEHOLDER_LOGO} 
          alt="Forasteros BBC Logo" 
          className="w-48 h-48 md:w-56 md:h-56 " 
        />
        
        {currentGame && currentGame.gamePhase !== GamePhase.FINISHED && (
          <button
            onClick={handleResumeGame}
            className={`${baseButtonClasses} bg-gradient-to-br from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 focus:ring-2 focus:ring-green-300`}
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
          className={`${baseButtonClasses} ${lightButtonClasses} ${darkButtonClasses}`}
        >
          <div>
            <h2 className="text-xl">Nuevo Partido</h2>
            <p className="text-sm text-gray-500 dark:text-slate-300">Configura y empieza un nuevo partido.</p>
          </div>
          <BasketballIcon className="w-8 h-8 text-brand-accent dark:text-white" />
        </Link>

        <Link
          to="/history"
          className={`${baseButtonClasses} ${lightButtonClasses} ${darkButtonClasses}`}
        >
          <div>
            <h2 className="text-xl">Historial de Partidos</h2>
            <p className="text-sm text-gray-500 dark:text-slate-300">Revisa estadísticas de partidos anteriores.</p>
          </div>
          <ClockIcon className="w-8 h-8 text-brand-accent dark:text-white" />
        </Link>

        <Link
          to="/roster"
          className={`${baseButtonClasses} ${lightButtonClasses} ${darkButtonClasses}`}
        >
          <div>
            <h2 className="text-xl">Gestionar Jugadores</h2>
            <p className="text-sm text-gray-500 dark:text-slate-300">Crea y edita tus plantillas de jugadores.</p>
          </div>
          <UsersIcon className="w-8 h-8 text-brand-accent dark:text-white" />
        </Link>

        {/* Import Games Button */}
        <input type="file" ref={gameImportRef} onChange={handleGameImportJSON} accept=".json" className="hidden" />
        <button
          onClick={() => gameImportRef.current?.click()}
          className={`${baseButtonClasses} ${lightButtonClasses} ${darkButtonClasses}`}
          aria-label="Importar partidos desde archivo JSON"
        >
          <div>
            <h2 className="text-xl">Importar Partidos</h2>
            <p className="text-sm text-gray-500 dark:text-slate-300">Carga partidos desde un archivo JSON.</p>
          </div>
          <ImportIcon className="w-8 h-8 text-brand-accent dark:text-white" />
        </button>
      </div>
    </div>
  );
});

export default HomePage;
