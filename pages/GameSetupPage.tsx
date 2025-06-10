

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Game, GameSettings, TeamGameInfo, GamePhase, initialPlayerStats, Team } from '../types';
import { INITIAL_GAME_SETTINGS } from '../constants';
import PlayerSelectionModal from '../components/PlayerSelectionModal'; 
import AlertDialog from '../components/AlertDialog';

interface GameSetupPageProps {
  roster: Player[];
  onGameSetup: (game: Game) => void;
  currentGame: Game | null;
  teams?: Team[]; 
}

const GameSetupPage: React.FC<GameSetupPageProps> = ({ roster, onGameSetup, currentGame, teams = [] }) => {
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

  const commonInputClasses = "w-full p-2 rounded bg-slate-200 dark:bg-slate-700 text-brand-text-primary-light dark:text-white border border-brand-border-light dark:border-slate-600 focus:border-brand-accent-light dark:focus:border-brand-accent select-auto";
  const labelClasses = "block text-sm font-medium text-brand-text-secondary-light dark:text-slate-300";
  const sectionClasses = "bg-brand-surface-light dark:bg-brand-surface p-6 rounded-lg shadow-md space-y-4";
  const buttonClasses = "w-full py-2 px-4 bg-brand-button-light dark:bg-brand-button hover:bg-brand-button-hover-light dark:hover:bg-brand-button-hover text-brand-text-primary-light dark:text-white rounded-md mt-1";


  useEffect(() => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
       setAlertInfo({isOpen: true, title: "Partido en Curso", message: "Ya hay un partido en curso. Finalízalo para empezar uno nuevo."});
    }
    setSettings(prevSettings => ({
        ...prevSettings,
        allowFoulOuts: INITIAL_GAME_SETTINGS.allowFoulOuts,
        maxPersonalFouls: INITIAL_GAME_SETTINGS.maxPersonalFouls
    }));
  }, [currentGame]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        setSettings(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    }
  };

  const handlePredefinedTeamSelect = (teamType: 'home' | 'away', teamId: string) => {
    const selectedTeam = teams.find(t => t.id === teamId);
    if (teamType === 'home') {
      setSelectedHomeTeamId(teamId);
      if (selectedTeam) {
        setHomeTeamName(selectedTeam.name);
        const playersFromRoster = selectedTeam.playerIds
          .map(id => roster.find(p => p.id === id))
          .filter(p => p && !awayPlayers.some(ap => ap.id === p.id)) as Player[];
        setHomePlayers(playersFromRoster);
      } else { 
        setHomeTeamName("Local"); 
        setHomePlayers([]);
      }
    } else {
      setSelectedAwayTeamId(teamId);
      if (selectedTeam) {
        setAwayTeamName(selectedTeam.name);
        const playersFromRoster = selectedTeam.playerIds
          .map(id => roster.find(p => p.id === id))
          .filter(p => p && !homePlayers.some(hp => hp.id === p.id)) as Player[]; 
        setAwayPlayers(playersFromRoster);
      } else {
        setAwayTeamName("Visitante");
        setAwayPlayers([]);
      }
    }
  };
  
  const handleTeamNameChange = (teamType: 'home' | 'away', name: string) => {
    if (teamType === 'home') {
        setHomeTeamName(name);
        if (selectedHomeTeamId) setSelectedHomeTeamId(''); 
    } else {
        setAwayTeamName(name);
        if (selectedAwayTeamId) setSelectedAwayTeamId('');
    }
  };


  const handleStartGame = () => {
    if (currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
      setAlertInfo({isOpen: true, title: "Partido en Curso", message: "No puedes iniciar un nuevo partido mientras otro está activo."});
      return;
    }
    if (homePlayers.length === 0 || awayPlayers.length === 0) {
      setAlertInfo({isOpen: true, title: "Error de Configuración", message: "Ambos equipos deben tener al menos un jugador."});
      return;
    }
    
    const homePlayerIds = new Set(homePlayers.map(p => p.id));
    const overlappingPlayer = awayPlayers.find(p => homePlayerIds.has(p.id));
    if (overlappingPlayer) {
      setAlertInfo({isOpen: true, title: "Conflicto de Jugadores", message: `El jugador ${overlappingPlayer.name} (#${overlappingPlayer.number}) no puede estar en ambos equipos.`});
      return;
    }

    const finalSettings: GameSettings = {
        ...settings,
        maxPersonalFouls: settings.allowFoulOuts ? Math.max(1, settings.maxPersonalFouls) : settings.maxPersonalFouls,
    };

    const createTeamInfo = (name: string, players: Player[]): TeamGameInfo => ({
      name,
      players,
      onCourt: players.slice(0, 5),
      bench: players.slice(5),
      stats: players.reduce((acc, p) => ({ ...acc, [p.id]: { ...initialPlayerStats } }), {}),
      score: 0,
      foulsThisQuarter: 0,
      timeoutsLeft: 5, 
    });

    const newGame: Game = {
      id: crypto.randomUUID(),
      settings: finalSettings,
      homeTeam: createTeamInfo(homeTeamName, homePlayers),
      awayTeam: createTeamInfo(awayTeamName, awayPlayers),
      currentQuarter: 1,
      isOvertime: false,
      gamePhase: GamePhase.WARMUP, 
      currentTimeRemainingInPhase: finalSettings.quarterDuration,
      startTime: null,
      endTime: null,
      gameLog: [],
      winningTeam: null,
      timerIsRunning: false, 
      lastTickTimestamp: null,
    };
    onGameSetup(newGame);
    navigate('/game');
  };

  const handleAlertClose = () => {
    if (alertInfo.title === "Partido en Curso" && currentGame && currentGame.gamePhase !== GamePhase.FINISHED) {
      navigate('/game');
    }
    setAlertInfo({ isOpen: false, title: '', message: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-center text-brand-text-primary-light dark:text-white mb-6">Configurar Nuevo Partido</h2>

      <div className={sectionClasses}>
        <h3 className="text-xl font-medium text-brand-text-primary-light dark:text-white">Ajustes del Partido</h3>
        <div>
          <label htmlFor="quarters" className={labelClasses}>Número de Cuartos</label>
          <input type="number" name="quarters" id="quarters" value={settings.quarters} onChange={handleSettingsChange} className={`mt-1 block w-full ${commonInputClasses}`} min="1" />
        </div>
        <div>
          <label htmlFor="quarterDuration" className={labelClasses}>Duración del Cuarto (minutos)</label>
          <input type="number" name="quarterDuration" id="quarterDuration" value={settings.quarterDuration / 60} onChange={(e) => setSettings(s => ({...s, quarterDuration: parseInt(e.target.value)*60}))} className={`mt-1 block w-full ${commonInputClasses}`} min="1" />
        </div>
        <div>
          <label htmlFor="overtimeDuration" className={labelClasses}>Duración Prórroga (minutos)</label>
          <input type="number" name="overtimeDuration" id="overtimeDuration" value={settings.overtimeDuration / 60} onChange={(e) => setSettings(s => ({...s, overtimeDuration: parseInt(e.target.value)*60}))} className={`mt-1 block w-full ${commonInputClasses}`} min="1" />
        </div>
        <div>
          <label htmlFor="foulsForBonus" className={labelClasses}>Faltas para Bonus</label>
          <input type="number" name="foulsForBonus" id="foulsForBonus" value={settings.foulsForBonus} onChange={handleSettingsChange} className={`mt-1 block w-full ${commonInputClasses}`} min="1" />
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="allowFoulOuts"
            id="allowFoulOuts"
            checked={settings.allowFoulOuts}
            onChange={handleSettingsChange}
            className="h-4 w-4 text-brand-accent-light dark:text-brand-accent bg-slate-200 dark:bg-slate-700 border-brand-border-light dark:border-slate-600 rounded focus:ring-brand-accent-light dark:focus:ring-brand-accent"
          />
          <label htmlFor="allowFoulOuts" className={labelClasses}>Permitir Expulsiones por Faltas</label>
        </div>
        <div>
          <label htmlFor="maxPersonalFouls" className={labelClasses}>Faltas para Expulsión</label>
          <input 
            type="number" 
            name="maxPersonalFouls" 
            id="maxPersonalFouls" 
            value={settings.maxPersonalFouls} 
            onChange={handleSettingsChange} 
            className={`mt-1 block w-full ${commonInputClasses} disabled:opacity-70 disabled:bg-slate-300 dark:disabled:bg-slate-800`} 
            min="1"
            disabled={!settings.allowFoulOuts} 
          />
           {!settings.allowFoulOuts && (
            <p className="text-xs text-brand-text-secondary-light dark:text-slate-400 mt-1">Activa "Permitir Expulsiones" para modificar.</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={sectionClasses}>
          <h3 className="text-xl font-medium text-brand-text-primary-light dark:text-white">Equipo Local</h3>
          <input type="text" placeholder="Nombre Equipo Local" value={homeTeamName} onChange={(e) => handleTeamNameChange('home', e.target.value)} className={commonInputClasses} />
          {teams.length > 0 && (
            <select value={selectedHomeTeamId} onChange={(e) => handlePredefinedTeamSelect('home', e.target.value)} className={`w-full mt-1 ${commonInputClasses}`}>
              <option value="">Cargar Equipo Predefinido (Manual)</option>
              {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          )}
          <button onClick={() => setIsHomeSelectionOpen(true)} className={buttonClasses}>Seleccionar Jugadores ({homePlayers.length})</button>
          <ul className="text-sm text-brand-text-secondary-light dark:text-slate-300 list-disc list-inside pl-2 max-h-20 overflow-y-auto">
            {homePlayers.map(p => <li key={p.id} className="truncate" title={`${p.name} (#${p.number})`}>{p.name} (#{p.number})</li>)}
          </ul>
        </div>

        <div className={sectionClasses}>
          <h3 className="text-xl font-medium text-brand-text-primary-light dark:text-white">Equipo Visitante</h3>
          <input type="text" placeholder="Nombre Equipo Visitante" value={awayTeamName} onChange={(e) => handleTeamNameChange('away', e.target.value)} className={commonInputClasses} />
          {teams.length > 0 && (
            <select value={selectedAwayTeamId} onChange={(e) => handlePredefinedTeamSelect('away', e.target.value)} className={`w-full mt-1 ${commonInputClasses}`}>
              <option value="">Cargar Equipo Predefinido (Manual)</option>
              {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          )}
          <button onClick={() => setIsAwaySelectionOpen(true)} className={buttonClasses}>Seleccionar Jugadores ({awayPlayers.length})</button>
          <ul className="text-sm text-brand-text-secondary-light dark:text-slate-300 list-disc list-inside pl-2 max-h-20 overflow-y-auto">
            {awayPlayers.map(p => <li key={p.id} className="truncate" title={`${p.name} (#${p.number})`}>{p.name} (#{p.number})</li>)}
          </ul>
        </div>
      </div>

      <button
        onClick={handleStartGame}
        disabled={!!(currentGame && currentGame.gamePhase !== GamePhase.FINISHED)}
        className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Iniciar Partido
      </button>

      {isHomeSelectionOpen && (
        <PlayerSelectionModal
          isOpen={isHomeSelectionOpen}
          onClose={() => setIsHomeSelectionOpen(false)}
          roster={roster}
          selectedPlayers={homePlayers}
          onConfirmSelection={setHomePlayers}
          teamName={homeTeamName}
          unavailablePlayerIds={awayPlayers.map(p => p.id)}
        />
      )}
      {isAwaySelectionOpen && (
        <PlayerSelectionModal
          isOpen={isAwaySelectionOpen}
          onClose={() => setIsAwaySelectionOpen(false)}
          roster={roster}
          selectedPlayers={awayPlayers}
          onConfirmSelection={setAwayPlayers}
          teamName={awayTeamName}
          unavailablePlayerIds={homePlayers.map(p => p.id)}
        />
      )}
       <AlertDialog
        isOpen={alertInfo.isOpen}
        onClose={handleAlertClose}
        title={alertInfo.title}
      >
        {alertInfo.message}
      </AlertDialog>
    </div>
  );
};

export default GameSetupPage;
