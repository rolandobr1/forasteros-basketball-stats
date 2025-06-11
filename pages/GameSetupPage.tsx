
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Game, GameSettings, TeamGameInfo, GamePhase, initialPlayerStats, Team } from '../types';
import { INITIAL_GAME_SETTINGS } from '../constants';
import PlayerSelectionModal from '../components/PlayerSelectionModal';
import AlertDialog from '../components/AlertDialog';
import PredefinedTeamSelectionModal from '../components/PredefinedTeamSelectionModal'; 
import { UsersIcon } from '../utils'; 

interface GameSetupPageProps {
  roster: Player[];
  onGameSetup: (game: Game) => void;
  currentGame: Game | null;
  teams?: Team[];
}

const GameSetupPage: React.FC<GameSetupPageProps> = React.memo(({ roster, onGameSetup, currentGame, teams = [] }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings>(INITIAL_GAME_SETTINGS);
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


  useEffect(() => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
       setAlertInfo({isOpen: true, title: "Partido en Curso", message: "Ya hay un partido en curso. Finalízalo para empezar uno nuevo."});
    }
    // Ensure initial settings are applied, especially if they might change globally
    setSettings(prevSettings => ({
        ...prevSettings, 
        quarters: INITIAL_GAME_SETTINGS.quarters, 
        quarterDuration: INITIAL_GAME_SETTINGS.quarterDuration,
        overtimeDuration: INITIAL_GAME_SETTINGS.overtimeDuration,
        foulsForBonus: INITIAL_GAME_SETTINGS.foulsForBonus,
        allowFoulOuts: INITIAL_GAME_SETTINGS.allowFoulOuts, 
        maxPersonalFouls: INITIAL_GAME_SETTINGS.maxPersonalFouls,
        breakDuration: INITIAL_GAME_SETTINGS.breakDuration,
    }));
  }, [currentGame]);

  const handleSettingsChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        let numericValue: number;
        if (value === '') {
            // Default to 1 for fields with min="1" if cleared
            if (name === 'quarters' || name === 'foulsForBonus' || name === 'maxPersonalFouls') {
                numericValue = 1;
            } else { // Should ideally not be hit for other numeric fields if they are durations
                numericValue = INITIAL_GAME_SETTINGS[name as keyof GameSettings] as number || 0;
            }
        } else {
            numericValue = parseInt(value, 10);
            if (isNaN(numericValue)) {
                 // If parsing results in NaN (e.g. "abc"), default to 1 or initial value
                if (name === 'quarters' || name === 'foulsForBonus' || name === 'maxPersonalFouls') {
                    numericValue = 1;
                } else {
                    numericValue = INITIAL_GAME_SETTINGS[name as keyof GameSettings] as number || 0;
                }
            }
        }
        
        // Ensure min attributes are respected programmatically as a safeguard
        if (name === 'quarters' || name === 'foulsForBonus' || name === 'maxPersonalFouls') {
           numericValue = Math.max(1, numericValue);
        }

        setSettings(prev => ({ ...prev, [name]: numericValue }));
    }
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
    const finalSettings: GameSettings = { ...settings, maxPersonalFouls: settings.allowFoulOuts ? Math.max(1, settings.maxPersonalFouls) : settings.maxPersonalFouls };
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
  }, [currentGame, homePlayers, awayPlayers, settings, homeTeamName, awayTeamName, onGameSetup, navigate]);

  const handleAlertClose = useCallback(() => {
    if (alertInfo.title === "Partido en Curso" && currentGame && currentGame.gamePhase !== GamePhase.FINISHED) navigate('/game');
    setAlertInfo({ isOpen: false, title: '', message: '' });
  }, [alertInfo.title, currentGame, navigate]);

  const inputBaseClass = "block w-full p-2 rounded border select-auto";
  const lightInputClass = "bg-gray-50 text-gray-800 border-gray-300 focus:border-brand-accent focus:ring-brand-accent";
  const darkInputClass = "dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:focus:border-brand-accent dark:focus:ring-brand-accent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-slate-300";
  const buttonClass = "w-full py-2 px-4 bg-gray-500 hover:bg-gray-600 dark:bg-brand-button dark:hover:bg-brand-button-hover text-white rounded-md";


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-center text-gray-800 dark:text-white mb-6">Configurar Nuevo Partido</h2>

      <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-4">
        <h3 className="text-xl font-medium text-gray-800 dark:text-white">Ajustes del Partido</h3>
        <div>
          <label htmlFor="quarters" className={labelClass}>Número de Cuartos</label>
          <input type="number" name="quarters" id="quarters" value={settings.quarters.toString()} onChange={handleSettingsChange} className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} mt-1`} min="1" />
        </div>
        <div>
          <label htmlFor="quarterDuration" className={labelClass}>Duración del Cuarto (minutos)</label>
          <input 
            type="number" 
            name="quarterDuration" 
            id="quarterDuration" 
            value={(settings.quarterDuration / 60).toString()} 
            onChange={(e) => {
              let minutes: number;
              if (e.target.value === '') {
                  minutes = 1; // Default to 1 minute if cleared, as min="1"
              } else {
                  minutes = parseInt(e.target.value, 10);
                  if (isNaN(minutes)) {
                      minutes = 1; // Default to 1 minute if invalid input
                  }
              }
              setSettings(s => ({...s, quarterDuration: Math.max(1, minutes) * 60 }));
            }} 
            className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} mt-1`} 
            min="1" 
          />
        </div>
        <div>
          <label htmlFor="overtimeDuration" className={labelClass}>Duración Prórroga (minutos)</label>
          <input 
            type="number" 
            name="overtimeDuration" 
            id="overtimeDuration" 
            value={(settings.overtimeDuration / 60).toString()} 
            onChange={(e) => {
              let minutes: number;
              if (e.target.value === '') {
                  minutes = 1; 
              } else {
                  minutes = parseInt(e.target.value, 10);
                  if (isNaN(minutes)) {
                      minutes = 1; 
                  }
              }
              setSettings(s => ({...s, overtimeDuration: Math.max(1, minutes) * 60 }));
            }} 
            className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} mt-1`} 
            min="1" 
          />
        </div>
        <div>
          <label htmlFor="foulsForBonus" className={labelClass}>Faltas para Bonus</label>
          <input type="number" name="foulsForBonus" id="foulsForBonus" value={settings.foulsForBonus.toString()} onChange={handleSettingsChange} className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} mt-1`} min="1" />
        </div>
        <div className="flex items-center space-x-3">
          <input type="checkbox" name="allowFoulOuts" id="allowFoulOuts" checked={settings.allowFoulOuts} onChange={handleSettingsChange}
            className="h-4 w-4 text-brand-accent bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-brand-accent" />
          <label htmlFor="allowFoulOuts" className="text-sm font-medium text-gray-700 dark:text-slate-300">Permitir Expulsiones por Faltas</label>
        </div>
        <div>
          <label htmlFor="maxPersonalFouls" className={labelClass}>Faltas para Expulsión</label>
          <input type="number" name="maxPersonalFouls" id="maxPersonalFouls" value={settings.maxPersonalFouls.toString()} onChange={handleSettingsChange} 
            className={`${inputBaseClass} ${lightInputClass} ${darkInputClass} mt-1 disabled:opacity-70 disabled:bg-gray-200 dark:disabled:bg-slate-800`} 
            min="1" disabled={!settings.allowFoulOuts} />
           {!settings.allowFoulOuts && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Activa "Permitir Expulsiones" para modificar.</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-3">
          <h3 className="text-xl font-medium text-gray-800 dark:text-white">Equipo Local</h3>
          <input type="text" placeholder="Nombre Equipo Local" value={homeTeamName} onChange={(e) => handleTeamNameChange('home', e.target.value)} className={`${inputBaseClass} ${lightInputClass} ${darkInputClass}`} />
          {teams.length > 0 && (
            <button onClick={() => setIsHomePredefinedTeamModalOpen(true)} className={`${buttonClass} mt-1 flex items-center justify-center`}>
              <UsersIcon className="w-4 h-4 mr-2" /> Cargar Equipo Predefinido
            </button>
          )}
          <button onClick={() => setIsHomeSelectionOpen(true)} className={`${buttonClass} mt-1`}>Seleccionar Jugadores ({homePlayers.length})</button>
          <ul className="text-sm text-gray-600 dark:text-slate-300 list-disc list-inside pl-2 max-h-20 overflow-y-auto">
            {homePlayers.map(p => <li key={p.id} className="truncate" title={`${p.name} (#${p.number})`}>{p.name} (#{p.number})</li>)}
          </ul>
        </div>

        <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-3">
          <h3 className="text-xl font-medium text-gray-800 dark:text-white">Equipo Visitante</h3>
          <input type="text" placeholder="Nombre Equipo Visitante" value={awayTeamName} onChange={(e) => handleTeamNameChange('away', e.target.value)} className={`${inputBaseClass} ${lightInputClass} ${darkInputClass}`} />
          {teams.length > 0 && (
            <button onClick={() => setIsAwayPredefinedTeamModalOpen(true)} className={`${buttonClass} mt-1 flex items-center justify-center`}>
              <UsersIcon className="w-4 h-4 mr-2" /> Cargar Equipo Predefinido
            </button>
          )}
          <button onClick={() => setIsAwaySelectionOpen(true)} className={`${buttonClass} mt-1`}>Seleccionar Jugadores ({awayPlayers.length})</button>
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
          selectedPlayers={homePlayers} onConfirmSelection={setHomePlayers} teamName={homeTeamName} unavailablePlayerIds={awayPlayers.map(p => p.id)} />
      )}
      {isAwaySelectionOpen && (
        <PlayerSelectionModal isOpen={isAwaySelectionOpen} onClose={() => setIsAwaySelectionOpen(false)} roster={roster}
          selectedPlayers={awayPlayers} onConfirmSelection={setAwayPlayers} teamName={awayTeamName} unavailablePlayerIds={homePlayers.map(p => p.id)} />
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
  );
});

export default GameSetupPage;
