
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Game, GameSettings, TeamGameInfo, GamePhase, initialPlayerStats, Team } from '../types';
import { INITIAL_GAME_SETTINGS, LOCAL_STORAGE_KEYS } from '../constants';
import PlayerSelectionModal from '../components/PlayerSelectionModal';
import AlertDialog from '../components/AlertDialog';
import PredefinedTeamSelectionModal from '../components/PredefinedTeamSelectionModal'; 
import { UsersIcon, PlusIcon, MinusIcon, AddUserIcon } from '../utils'; 
import { useLocalStorage } from '../hooks/useLocalStorage';


interface GameSetupPageProps {
  roster: Player[];
  onGameSetup: (game: Game) => void;
  currentGame: Game | null;
  teams?: Team[];
}

const GameSetupPage: React.FC<GameSetupPageProps> = React.memo(({ roster, onGameSetup, currentGame, teams = [] }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings>(INITIAL_GAME_SETTINGS);
  const [gameNameInput, setGameNameInput] = useState<string>('');
  const [homeTeamName, setHomeTeamName] = useState("Local");
  const [awayTeamName, setAwayTeamName] = useState("Visitante");
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [isHomeSelectionOpen, setIsHomeSelectionOpen] = useState(false);
  const [isAwaySelectionOpen, setIsAwaySelectionOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });
  
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string>('');
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState<string>('');
  const [isHomePredefinedTeamModalOpen, setIsHomePredefinedTeamModalOpen] = useState(false);
  const [isAwayPredefinedTeamModalOpen, setIsAwayPredefinedTeamModalOpen] = useState(false);
  const [gameHistory] = useLocalStorage<Game[]>(LOCAL_STORAGE_KEYS.GAME_HISTORY, []);


  useEffect(() => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
       setAlertInfo({isOpen: true, title: "Partido en Curso", message: "Ya hay un partido en curso. Finalízalo para empezar uno nuevo."});
    }
    // Ensure initial settings are applied, especially if they might change globally
    setSettings(prevSettings => ({
        ...prevSettings, 
        gameName: INITIAL_GAME_SETTINGS.gameName,
        quarters: INITIAL_GAME_SETTINGS.quarters, 
        quarterDuration: INITIAL_GAME_SETTINGS.quarterDuration,
        overtimeDuration: INITIAL_GAME_SETTINGS.overtimeDuration,
        foulsForBonus: INITIAL_GAME_SETTINGS.foulsForBonus,
        allowFoulOuts: INITIAL_GAME_SETTINGS.allowFoulOuts, 
        maxPersonalFouls: INITIAL_GAME_SETTINGS.maxPersonalFouls,
        breakDuration: INITIAL_GAME_SETTINGS.breakDuration,
    }));
    setGameNameInput(''); // Reset game name input field
  }, [currentGame]);

  const handleSettingsChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'gameName') {
        setGameNameInput(value);
        return;
    }
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        let numericValue: number;
        if (value === '') {
            if (name === 'quarters' || name === 'foulsForBonus' || name === 'maxPersonalFouls') {
                numericValue = 1;
            } else { 
                numericValue = INITIAL_GAME_SETTINGS[name as keyof GameSettings] as number || 0;
            }
        } else {
            numericValue = parseInt(value, 10);
            if (isNaN(numericValue)) {
                if (name === 'quarters' || name === 'foulsForBonus' || name === 'maxPersonalFouls') {
                    numericValue = 1;
                } else {
                    numericValue = INITIAL_GAME_SETTINGS[name as keyof GameSettings] as number || 0;
                }
            }
        }
        
        if (name === 'quarters' || name === 'foulsForBonus' || name === 'maxPersonalFouls') {
           numericValue = Math.max(1, numericValue);
        }
        // For duration fields, the value from input is minutes, convert to seconds for storage
        if (name === 'quarterDuration' || name === 'overtimeDuration') {
            numericValue = Math.max(1, numericValue) * 60;
        }

        setSettings(prev => ({ ...prev, [name]: numericValue }));
    }
  }, []);

  const handleSettingIncrementDecrement = useCallback((
    field: 'quarters' | 'quarterDuration' | 'overtimeDuration' | 'foulsForBonus' | 'maxPersonalFouls',
    amount: number // Typically 1 or -1
  ) => {
    setSettings(prev => {
      let newValue: number;
      if (field === 'quarterDuration' || field === 'overtimeDuration') {
        const currentMinutes = prev[field] / 60;
        newValue = (currentMinutes + amount) * 60;
        if (newValue < 60) newValue = 60; // Min 1 minute (60 seconds)
      } else {
        newValue = (prev[field] as number) + amount;
        if (newValue < 1) newValue = 1; // Min 1 for quarters, foulsForBonus, maxPersonalFouls
      }
      return { ...prev, [field]: newValue };
    });
  }, []);


  const loadPredefinedTeam = useCallback((teamType: 'home' | 'away', team: Team) => {
    if (teamType === 'home') {
      setSelectedHomeTeamId(team.id);
      setHomeTeamName(team.name);
      const playersFromRoster = team.playerIds
        .map(id => roster.find(p => p.id === id))
        .filter(p => p && !awayPlayers.some(ap => ap.id === p.id)) as Player[];
      setHomePlayers(playersFromRoster);
    } else { 
      setSelectedAwayTeamId(team.id);
      setAwayTeamName(team.name);
      const playersFromRoster = team.playerIds
        .map(id => roster.find(p => p.id === id))
        .filter(p => p && !homePlayers.some(hp => hp.id === p.id)) as Player[];
      setAwayPlayers(playersFromRoster);
    }
  }, [roster, homePlayers, awayPlayers]);
  
  const handleTeamNameChange = useCallback((teamType: 'home' | 'away', name: string) => {
    if (teamType === 'home') {
        setHomeTeamName(name); 
        if (selectedHomeTeamId) setSelectedHomeTeamId(''); 
    } else {
        setAwayTeamName(name); 
        if (selectedAwayTeamId) setSelectedAwayTeamId(''); 
    }
  }, [selectedHomeTeamId, selectedAwayTeamId]);

  const handleStartGame = useCallback(() => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
      setAlertInfo({isOpen: true, title: "Partido en Curso", message: "No puedes iniciar un nuevo partido mientras otro está activo."}); return;
    }
    if (homePlayers.length === 0 || awayPlayers.length === 0) {
      setAlertInfo({isOpen: true, title: "Error de Configuración", message: "Ambos equipos deben tener al menos un jugador."}); return;
    }
    const homePlayerIds = new Set(homePlayers.map(p => p.id));
    const overlappingPlayer = awayPlayers.find(p => homePlayerIds.has(p.id));
    if (overlappingPlayer) {
      setAlertInfo({isOpen: true, title: "Conflicto de Jugadores", message: `El jugador ${overlappingPlayer.name} (#${overlappingPlayer.number}) no puede estar en ambos equipos.`}); return;
    }

    let gameName = gameNameInput.trim();
    if (!gameName) {
      const gameNumber = gameHistory.length + 1;
      const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      gameName = `Juego ${gameNumber} - ${currentDate}`;
    }

    const finalSettings: GameSettings = { 
        ...settings, 
        gameName,
        maxPersonalFouls: settings.allowFoulOuts ? Math.max(1, settings.maxPersonalFouls) : settings.maxPersonalFouls 
    };

    const createTeamInfo = (name: string, players: Player[]): TeamGameInfo => ({
      name, players, onCourt: players.slice(0, 5), bench: players.slice(5),
      stats: players.reduce((acc, p) => ({ ...acc, [p.id]: { ...initialPlayerStats } }), {}),
      score: 0, foulsThisQuarter: 0, timeoutsLeft: 5, 
    });
    const newGame: Game = {
      id: crypto.randomUUID(), settings: finalSettings,
      homeTeam: createTeamInfo(homeTeamName, homePlayers), awayTeam: createTeamInfo(awayTeamName, awayPlayers),
      currentQuarter: 1, isOvertime: false, gamePhase: GamePhase.WARMUP, 
      currentTimeRemainingInPhase: finalSettings.quarterDuration, startTime: null, endTime: null,
      gameLog: [], winningTeam: null, timerIsRunning: false, lastTickTimestamp: null,
    };
    onGameSetup(newGame); navigate('/game');
  }, [currentGame, homePlayers, awayPlayers, settings, homeTeamName, awayTeamName, onGameSetup, navigate, gameNameInput, gameHistory]);

  const handleAlertClose = useCallback(() => {
    if (alertInfo.title === "Partido en Curso" && currentGame && currentGame.gamePhase !== GamePhase.FINISHED) navigate('/game');
    setAlertInfo({ isOpen: false, title: '', message: '' });
  }, [alertInfo.title, currentGame, navigate]);

  const handleGoToRosterManagement = useCallback(() => {
    navigate('/roster');
  }, [navigate]);

  const inputBaseClass = "block p-2 rounded border select-auto";
  const lightInputClass = "bg-gray-50 text-gray-800 border-gray-300 focus:border-brand-accent focus:ring-brand-accent";
  const darkInputClass = "dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:focus:border-brand-accent dark:focus:ring-brand-accent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-slate-300";
  const buttonClass = "w-full py-2 px-4 text-white rounded-md flex items-center justify-center"; // Removed default bg
  const incDecButtonClass = "p-2 bg-gray-200 dark:bg-slate-600 rounded hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50 text-gray-700 dark:text-white";


  return (
    <div className="container mx-auto px-4">
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold text-center text-gray-800 dark:text-white mb-6">Configurar Nuevo Partido</h2>

        <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-4">
          <h3 className="text-xl font-medium text-gray-800 dark:text-white">Ajustes del Partido</h3>
          <div>
            <label htmlFor="gameName" className={labelClass}>Nombre del Partido (Opcional)</label>
            <input
              type="text"
              name="gameName"
              id="gameName"
              value={gameNameInput}
              onChange={handleSettingsChange}
              placeholder={`Ej: Final Campeonato o dejar vacío para auto-generar`}
              className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} w-full mt-1`}
            />
          </div>
          <div>
            <label htmlFor="quarters" className={labelClass}>Número de Cuartos</label>
            <div className="flex items-center space-x-2 mt-1">
              <button onClick={() => handleSettingIncrementDecrement('quarters', -1)} disabled={settings.quarters <= 1} className={incDecButtonClass} aria-label="Disminuir cuartos"><MinusIcon className="w-4 h-4" /></button>
              <input 
                type="number" 
                name="quarters" 
                id="quarters" 
                value={settings.quarters.toString()} 
                onChange={handleSettingsChange} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                inputMode="numeric" 
                pattern="[0-9]*"
                className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} text-center w-full flex-grow`} 
                min="1" 
              />
              <button onClick={() => handleSettingIncrementDecrement('quarters', 1)} className={incDecButtonClass} aria-label="Aumentar cuartos"><PlusIcon className="w-4 h-4" /></button>
            </div>
          </div>
          <div>
            <label htmlFor="quarterDuration" className={labelClass}>Duración del Cuarto (minutos)</label>
            <div className="flex items-center space-x-2 mt-1">
              <button onClick={() => handleSettingIncrementDecrement('quarterDuration', -1)} disabled={settings.quarterDuration <= 60} className={incDecButtonClass} aria-label="Disminuir duración cuarto"><MinusIcon className="w-4 h-4" /></button>
              <input 
                type="number" 
                name="quarterDuration" 
                id="quarterDuration" 
                value={(settings.quarterDuration / 60).toString()} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                    const minutes = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                    setSettings(s => ({...s, quarterDuration: Math.max(1, isNaN(minutes) ? 1 : minutes) * 60 }));
                }}
                className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} text-center w-full flex-grow`} 
                min="1" 
              />
              <button onClick={() => handleSettingIncrementDecrement('quarterDuration', 1)} className={incDecButtonClass} aria-label="Aumentar duración cuarto"><PlusIcon className="w-4 h-4" /></button>
            </div>
          </div>
          <div>
            <label htmlFor="overtimeDuration" className={labelClass}>Duración Prórroga (minutos)</label>
            <div className="flex items-center space-x-2 mt-1">
              <button onClick={() => handleSettingIncrementDecrement('overtimeDuration', -1)} disabled={settings.overtimeDuration <= 60} className={incDecButtonClass} aria-label="Disminuir duración prórroga"><MinusIcon className="w-4 h-4" /></button>
              <input 
                type="number" 
                name="overtimeDuration" 
                id="overtimeDuration" 
                value={(settings.overtimeDuration / 60).toString()} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                    const minutes = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                    setSettings(s => ({...s, overtimeDuration: Math.max(1, isNaN(minutes) ? 1 : minutes) * 60 }));
                }}
                className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} text-center w-full flex-grow`} 
                min="1" 
              />
              <button onClick={() => handleSettingIncrementDecrement('overtimeDuration', 1)} className={incDecButtonClass} aria-label="Aumentar duración prórroga"><PlusIcon className="w-4 h-4" /></button>
            </div>
          </div>
          <div>
            <label htmlFor="foulsForBonus" className={labelClass}>Faltas para Bonus</label>
            <div className="flex items-center space-x-2 mt-1">
              <button onClick={() => handleSettingIncrementDecrement('foulsForBonus', -1)} disabled={settings.foulsForBonus <= 1} className={incDecButtonClass} aria-label="Disminuir faltas para bonus"><MinusIcon className="w-4 h-4" /></button>
              <input 
                type="number" 
                name="foulsForBonus" 
                id="foulsForBonus" 
                value={settings.foulsForBonus.toString()} 
                onChange={handleSettingsChange} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                inputMode="numeric"
                pattern="[0-9]*"
                className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} text-center w-full flex-grow`} 
                min="1" 
              />
              <button onClick={() => handleSettingIncrementDecrement('foulsForBonus', 1)} className={incDecButtonClass} aria-label="Aumentar faltas para bonus"><PlusIcon className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" name="allowFoulOuts" id="allowFoulOuts" checked={settings.allowFoulOuts} onChange={handleSettingsChange}
              className="h-4 w-4 text-brand-accent bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-brand-accent" />
            <label htmlFor="allowFoulOuts" className="text-sm font-medium text-gray-700 dark:text-slate-300">Permitir Expulsiones por Faltas</label>
          </div>
          <div>
            <label htmlFor="maxPersonalFouls" className={labelClass}>Faltas para Expulsión</label>
            <div className="flex items-center space-x-2 mt-1">
              <button onClick={() => handleSettingIncrementDecrement('maxPersonalFouls', -1)} disabled={!settings.allowFoulOuts || settings.maxPersonalFouls <= 1} className={incDecButtonClass} aria-label="Disminuir faltas para expulsión"><MinusIcon className="w-4 h-4" /></button>
              <input 
                type="number" 
                name="maxPersonalFouls" 
                id="maxPersonalFouls" 
                value={settings.maxPersonalFouls.toString()} 
                onChange={handleSettingsChange} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                inputMode="numeric"
                pattern="[0-9]*"
                className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} text-center w-full flex-grow disabled:opacity-70 disabled:bg-gray-200 dark:disabled:bg-slate-800`} 
                min="1" 
                disabled={!settings.allowFoulOuts} 
              />
              <button onClick={() => handleSettingIncrementDecrement('maxPersonalFouls', 1)} disabled={!settings.allowFoulOuts} className={incDecButtonClass} aria-label="Aumentar faltas para expulsión"><PlusIcon className="w-4 h-4" /></button>
            </div>
             {!settings.allowFoulOuts && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Activa "Permitir Expulsiones" para modificar.</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-3">
            <h3 className="text-xl font-medium text-gray-800 dark:text-white">Equipo Local</h3>
            <input type="text" placeholder="Nombre Equipo Local" value={homeTeamName} onChange={(e) => handleTeamNameChange('home', e.target.value)} className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} w-full`} />
            {teams.length > 0 && (
              <button 
                onClick={() => setIsHomePredefinedTeamModalOpen(true)} 
                className={`${buttonClass} bg-blue-900 hover:bg-blue-700 dark:bg-brand-button dark:hover:bg-brand-button-hover mt-1`}
              >
                <UsersIcon className="w-5 h-5 mr-2" /> Cargar Equipo Predefinido
              </button>
            )}
            <button 
              onClick={() => setIsHomeSelectionOpen(true)} 
              className={`${buttonClass} bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mt-1`}
            >
              <AddUserIcon className="w-6 h-6 mr-2" />
              Seleccionar Jugadores ({homePlayers.length})
            </button>
            <ul className="text-sm text-gray-600 dark:text-slate-300 list-disc list-inside pl-2 max-h-20 overflow-y-auto">
              {homePlayers.map(p => <li key={p.id} className="truncate" title={`${p.name} (#${p.number})`}>{p.name} (#{p.number})</li>)}
            </ul>
          </div>

          <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-3">
            <h3 className="text-xl font-medium text-gray-800 dark:text-white">Equipo Visitante</h3>
            <input type="text" placeholder="Nombre Equipo Visitante" value={awayTeamName} onChange={(e) => handleTeamNameChange('away', e.target.value)} className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} w-full`} />
            {teams.length > 0 && (
              <button 
                onClick={() => setIsAwayPredefinedTeamModalOpen(true)} 
                className={`${buttonClass} bg-blue-900 hover:bg-blue-700 dark:bg-brand-button dark:hover:bg-brand-button-hover mt-1`}
              >
                <UsersIcon className="w-5 h-5 mr-2" /> Cargar Equipo Predefinido
              </button>
            )}
            <button 
              onClick={() => setIsAwaySelectionOpen(true)} 
              className={`${buttonClass} bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mt-1`}
            >
               <AddUserIcon className="w-6 h-6 mr-2" />
              Seleccionar Jugadores ({awayPlayers.length})
            </button>
            <ul className="text-sm text-gray-600 dark:text-slate-300 list-disc list-inside pl-2 max-h-20 overflow-y-auto">
              {awayPlayers.map(p => <li key={p.id} className="truncate" title={`${p.name} (#${p.number})`}>{p.name} (#{p.number})</li>)}
            </ul>
          </div>
        </div>

        <button onClick={handleStartGame} disabled={!!(currentGame && currentGame.gamePhase !== GamePhase.FINISHED)}
          className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Iniciar Partido
        </button>

        {isHomeSelectionOpen && (
          <PlayerSelectionModal isOpen={isHomeSelectionOpen} onClose={() => setIsHomeSelectionOpen(false)} roster={roster}
            selectedPlayers={homePlayers} onConfirmSelection={setHomePlayers} teamName={homeTeamName} unavailablePlayerIds={awayPlayers.map(p => p.id)} 
            onGoToRosterManagement={handleGoToRosterManagement} />
        )}
        {isAwaySelectionOpen && (
          <PlayerSelectionModal isOpen={isAwaySelectionOpen} onClose={() => setIsAwaySelectionOpen(false)} roster={roster}
            selectedPlayers={awayPlayers} onConfirmSelection={setAwayPlayers} teamName={awayTeamName} unavailablePlayerIds={homePlayers.map(p => p.id)} 
            onGoToRosterManagement={handleGoToRosterManagement} />
        )}
        {isHomePredefinedTeamModalOpen && (
          <PredefinedTeamSelectionModal 
              isOpen={isHomePredefinedTeamModalOpen} 
              onClose={() => setIsHomePredefinedTeamModalOpen(false)}
              allTeams={teams}
              onTeamSelected={(team) => loadPredefinedTeam('home', team)}
              currentSelectedTeamId={selectedHomeTeamId}
              title={`Cargar Equipo Local`}
          />
        )}
        {isAwayPredefinedTeamModalOpen && (
          <PredefinedTeamSelectionModal 
              isOpen={isAwayPredefinedTeamModalOpen} 
              onClose={() => setIsAwayPredefinedTeamModalOpen(false)}
              allTeams={teams.filter(t => t.id !== selectedHomeTeamId)} 
              onTeamSelected={(team) => loadPredefinedTeam('away', team)}
              currentSelectedTeamId={selectedAwayTeamId}
              title={`Cargar Equipo Visitante`}
          />
        )}
         <AlertDialog isOpen={alertInfo.isOpen} onClose={handleAlertClose} title={alertInfo.title}> {alertInfo.message} </AlertDialog>
      </div>
    </div>
  );
});

export default GameSetupPage;
