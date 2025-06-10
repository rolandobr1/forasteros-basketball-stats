

import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Player, Team } from '../types';
import { PLAYER_POSITIONS } from '../constants';
import { PlusIcon, EditIcon, DeleteIcon, SaveIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, BasketballIcon } from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamPlayersAssignmentModal from '../components/TeamPlayersAssignmentModal';
import CreateTeamWithPlayersModal from '../components/CreateTeamWithPlayersModal'; // Import new modal
import AlertDialog from '../components/AlertDialog'; // Import AlertDialog

interface RosterManagementPageProps {
  players: Player[];
  onAddPlayer: (player: Omit<Player, 'id' | 'position'> & { position?: string }) => void;
  onAddPlayersBatch: (playersData: Array<Omit<Player, 'id' | 'position'> & { position?: string }>) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onReorderPlayers: (players: Player[]) => void;
  teams: Team[];
  onAddTeam: (name: string, playerIds?: string[]) => void; // Modified signature
  onUpdateTeamName: (teamId: string, newName: string) => void;
  onDeleteTeam: (teamId: string) => void;
  onAssignPlayersToTeam: (teamId: string, playerIds: string[]) => void;
}

type SortKey = 'number' | 'name' | 'position' | 'manual';
interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

const RANDOM_FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Cameron", "Drew", "Blake"];
const RANDOM_LAST_NAMES = ["Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Garcia", "Rodriguez"];

const PlayerRow: React.FC<{
  player: Player;
  rowIndex: number; // For organization number
  isEditing: boolean;
  editFormData: Partial<Player>;
  onEditFieldChange: (field: keyof Player, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (player: Player) => void;
  onDelete: (playerId: string) => void;
  onMoveUp: (playerId: string) => void;
  onMoveDown: (playerId: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isSortManual: boolean;
}> = React.memo(({ 
  player, rowIndex, isEditing, editFormData, onEditFieldChange, 
  onSaveEdit, onCancelEdit, onStartEdit, onDelete, 
  onMoveUp, onMoveDown, isFirst, isLast, isSortManual
}) => {
  const commonInputClasses = "w-full p-2 rounded bg-slate-200 dark:bg-slate-700 text-brand-text-primary-light dark:text-white border border-brand-border-light dark:border-slate-600 focus:border-brand-accent-light dark:focus:border-brand-accent select-auto";
  const buttonClasses = "p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300";
  const deleteButtonClasses = "p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300";


  if (isEditing) {
    return (
      <div className="bg-brand-surface-light dark:bg-brand-surface p-3 rounded-md shadow-lg space-y-2">
        <input
          type="text"
          value={editFormData.name || ''}
          onChange={(e) => onEditFieldChange('name', e.target.value)}
          placeholder="Nombre"
          className={commonInputClasses}
        />
        <input
          type="text"
          value={editFormData.number || ''}
          onChange={(e) => onEditFieldChange('number', e.target.value)}
          placeholder="Número"
          className={commonInputClasses}
        />
        <select
          value={editFormData.position || ''}
          onChange={(e) => onEditFieldChange('position', e.target.value)}
          className={commonInputClasses}
        >
          <option value="">-- Sin Posición --</option>
          {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
        </select>
        <div className="flex space-x-2 justify-end">
          <button onClick={onSaveEdit} className="p-2 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"><SaveIcon className="w-4 h-4" /></button>
          <button onClick={onCancelEdit} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-brand-surface-light dark:bg-brand-surface p-3 rounded-md shadow hover:shadow-lg transition-shadow">
      <div className="flex items-center space-x-3 flex-grow min-w-0">
        <span className="text-brand-text-secondary-light dark:text-slate-400 font-medium w-8 text-right flex-shrink-0">{rowIndex + 1}.</span>
        <div className="truncate flex-grow">
            <span className="text-brand-text-primary-light dark:text-white block truncate">{player.name}</span>
            {player.position && <span className="text-xs text-brand-text-secondary-light dark:text-slate-400 block truncate">{player.position}</span>}
        </div>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
        <span className="text-brand-text-primary-light dark:text-white font-semibold w-10 sm:w-12 text-center">{player.number ? `#${player.number}`: '-'}</span>
        {isSortManual && (
          <>
            <button
              onClick={() => onMoveUp(player.id)}
              disabled={isFirst}
              className={`${buttonClasses} disabled:opacity-50`}
              aria-label="Mover arriba"
            >
              <ChevronUpIcon className="w-4 h-4"/>
            </button>
            <button
              onClick={() => onMoveDown(player.id)}
              disabled={isLast}
              className={`${buttonClasses} disabled:opacity-50`}
              aria-label="Mover abajo"
            >
              <ChevronDownIcon className="w-4 h-4"/>
            </button>
          </>
        )}
        <button onClick={() => onStartEdit(player)} className={buttonClasses} aria-label="Editar">
          <EditIcon className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(player.id)} className={deleteButtonClasses} aria-label="Eliminar">
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});


const RosterManagementPage: React.FC<RosterManagementPageProps> = ({
  players,
  onAddPlayer,
  onAddPlayersBatch,
  onUpdatePlayer,
  onDeletePlayer,
  onReorderPlayers,
  teams,
  onAddTeam,
  onUpdateTeamName,
  onDeleteTeam,
  onAssignPlayersToTeam,
}) => {
  const [isPlayerListOpen, setIsPlayerListOpen] = useState(false);
  const [isTeamListOpen, setIsTeamListOpen] = useState(false);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [formPlayerData, setFormPlayerData] = useState<Omit<Player, 'id'>>({ name: '', number: '', position: ''});
  const [editRowData, setEditRowData] = useState<Partial<Player>>({});
  const [showConfirmDeletePlayer, setShowConfirmDeletePlayer] = useState(false);
  const [playerToDeleteId, setPlayerToDeleteId] = useState<string | null>(null);
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'manual', direction: 'ascending' });

  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamNameValue, setEditingTeamNameValue] = useState('');
  const [showConfirmDeleteTeam, setShowConfirmDeleteTeam] = useState(false);
  const [teamToDeleteId, setTeamToDeleteId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [teamToAssignPlayers, setTeamToAssignPlayers] = useState<Team | null>(null);

  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [pendingTeamNameForCreation, setPendingTeamNameForCreation] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  const commonInputClasses = "w-full p-2 rounded bg-slate-200 dark:bg-slate-700 text-brand-text-primary-light dark:text-white border border-brand-border-light dark:border-slate-600 focus:border-brand-accent-light dark:focus:border-brand-accent select-auto";
  const commonSelectClasses = "p-1.5 rounded bg-slate-200 dark:bg-slate-700 text-brand-text-primary-light dark:text-white text-sm border border-brand-border-light dark:border-slate-600 focus:border-brand-accent-light dark:focus:border-brand-accent";
  const primaryButtonClasses = "flex-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-400 flex items-center justify-center";
  const secondaryButtonClasses = "flex-1 px-3 py-1.5 text-sm bg-slate-500 text-white rounded-md hover:bg-slate-600 dark:hover:bg-slate-400 flex items-center justify-center";
  const sectionTitleClasses = "text-xl font-semibold text-brand-text-primary-light dark:text-white";
  const formSectionClasses = "bg-brand-surface-light dark:bg-brand-surface p-4 rounded-lg shadow-md space-y-3";
  const mainSectionClasses = "bg-white dark:bg-brand-dark p-4 rounded-lg shadow-xl space-y-4";
  const listToggleButtonClasses = "w-full flex justify-between items-center p-2.5 bg-brand-surface-light dark:bg-brand-surface hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-brand-text-primary-light dark:text-white font-semibold text-base focus:outline-none";


  const handleFormChange = (field: keyof Omit<Player, 'id'>, value: string) => {
    setFormPlayerData(prev => ({ ...prev, [field]: value }));
  };
  const handleEditRowFieldChange = (field: keyof Player, value: string) => {
    setEditRowData(prev => ({ ...prev, [field]: value }));
  };

  const generateSingleUniqueNumber = useCallback(() => {
    const existingNumbers = players.map(p => p.number);
    let numericCounter = 1;
    while(existingNumbers.includes(String(numericCounter))){
      numericCounter++;
    }
    return String(numericCounter);
  }, [players]);

  const handleAddNewPlayer = () => {
    let { name, number, position } = formPlayerData;
    name = name.trim();
    number = number.trim();

    if (!name) {
        const firstName = RANDOM_FIRST_NAMES[Math.floor(Math.random() * RANDOM_FIRST_NAMES.length)];
        const lastName = RANDOM_LAST_NAMES[Math.floor(Math.random() * RANDOM_LAST_NAMES.length)];
        name = `${firstName} ${lastName}`;
    }
    if (!number) {
        number = generateSingleUniqueNumber();
    }
    if (number && !/^[a-zA-Z0-9]+$/.test(number)) {
        setAlertInfo({ isOpen: true, title: "Error de Formato", message: "El número de jugador solo puede contener letras y números."}); return;
    }
    onAddPlayer({ name, number, position });
    setFormPlayerData({ name: '', number: '', position: position }); 
  };

  const handlePlayerNamePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text');
    const lines = pastedText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
  
    if (lines.length > 0) {
      event.preventDefault(); 
      const batchToAdd: Array<Omit<Player, 'id' | 'position'> & { position?: string }> = [];
      const usedNumbersInThisOperation = new Set(players.map(p => p.number)); 
      let numericCounter = 1; 

      lines.forEach(lineContent => {
        let name = lineContent.trim();
        
        while (usedNumbersInThisOperation.has(String(numericCounter))) {
          numericCounter++;
        }
        const newNumber = String(numericCounter);
        usedNumbersInThisOperation.add(newNumber); 
        
        if (!name) { 
            const firstName = RANDOM_FIRST_NAMES[Math.floor(Math.random() * RANDOM_FIRST_NAMES.length)];
            const lastName = RANDOM_LAST_NAMES[Math.floor(Math.random() * RANDOM_LAST_NAMES.length)];
            name = `${firstName} ${lastName}`;
        }
        
        batchToAdd.push({ name, number: newNumber, position: formPlayerData.position });
      });

      if (batchToAdd.length > 0) {
        onAddPlayersBatch(batchToAdd);
      }
      setFormPlayerData(prev => ({ ...prev, name: '', number: '' })); 
    }
  };

  const handleStartEditRow = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditRowData({ name: player.name, number: player.number, position: player.position });
  };

  const handleSaveEditRow = () => {
    if (!editingPlayerId) return;
    const playerToUpdate = players.find(p => p.id === editingPlayerId);
    if (!playerToUpdate || !editRowData.name?.trim() || !editRowData.number?.trim()) {
      setAlertInfo({ isOpen: true, title: "Campos Requeridos", message: "Nombre y número son requeridos para editar."}); return;
    }
    if (editRowData.number.trim() !== "" && !/^[a-zA-Z0-9]+$/.test(editRowData.number.trim())) {
        setAlertInfo({ isOpen: true, title: "Error de Formato", message: "El número de jugador solo puede contener letras y números."}); return;
    }
    onUpdatePlayer({ ...playerToUpdate, name: editRowData.name.trim(), number: editRowData.number.trim(), position: editRowData.position || '' });
    setEditingPlayerId(null); setEditRowData({});
  };
  const handleCancelEditRow = () => { setEditingPlayerId(null); setEditRowData({}); };
  const handleDeletePlayerRequest = (playerId: string) => { setPlayerToDeleteId(playerId); setShowConfirmDeletePlayer(true); };
  const confirmDeletePlayer = () => {
    if (playerToDeleteId) onDeletePlayer(playerToDeleteId);
    if (editingPlayerId === playerToDeleteId) handleCancelEditRow();
    setShowConfirmDeletePlayer(false); setPlayerToDeleteId(null);
  };
  const movePlayer = useCallback((playerId: string, direction: 'up' | 'down') => {
    const index = players.findIndex(p => p.id === playerId); if (index === -1) return;
    const newPlayersList = [...players]; const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlayersList.length) return;
    [newPlayersList[index], newPlayersList[targetIndex]] = [newPlayersList[targetIndex], newPlayersList[index]];
    onReorderPlayers(newPlayersList); setSortConfig({ key: 'manual', direction: 'ascending' }); 
  }, [players, onReorderPlayers]);
  const sortedAndFilteredPlayers = useMemo(() => {
    let filtered = [...players];
    if (filterPosition) filtered = filtered.filter(player => player.position === filterPosition);
    if (sortConfig.key !== 'manual') {
      filtered.sort((a, b) => {
        let valA = '', valB = '';
        switch (sortConfig.key) {
          case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
          case 'number':
            const numAIsNaN = isNaN(parseInt(a.number, 10));
            const numBIsNaN = isNaN(parseInt(b.number, 10));
            if (!numAIsNaN && !numBIsNaN) return sortConfig.direction === 'ascending' ? parseInt(a.number, 10) - parseInt(b.number, 10) : parseInt(b.number, 10) - parseInt(a.number, 10);
            if (numAIsNaN && !numBIsNaN) return 1; 
            if (!numAIsNaN && numBIsNaN) return -1;
            valA = a.number; valB = b.number; break; 
          case 'position': valA = a.position?.toLowerCase() || 'zzzz'; valB = b.position?.toLowerCase() || 'zzzz'; break;
        }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [players, filterPosition, sortConfig]);
  const toggleSortDirection = () => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' }));

  const handleOpenCreateTeamModal = () => {
    const trimmedName = newTeamName.trim();
    if (!trimmedName) {
      setAlertInfo({ isOpen: true, title: "Nombre Requerido", message: "El nombre del equipo no puede estar vacío." });
      return;
    }
    if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
      setAlertInfo({ isOpen: true, title: "Nombre Duplicado", message: "Ya existe un equipo con este nombre." });
      return;
    }
    setPendingTeamNameForCreation(trimmedName);
    setIsCreateTeamModalOpen(true);
  };

  const handleConfirmCreateTeamWithPlayers = (selectedPlayerIds: string[]) => {
    onAddTeam(pendingTeamNameForCreation, selectedPlayerIds);
    setNewTeamName(''); 
    setIsCreateTeamModalOpen(false);
    setPendingTeamNameForCreation('');
  };

  const handleStartEditTeamName = (team: Team) => { setEditingTeamId(team.id); setEditingTeamNameValue(team.name); };
  const handleSaveTeamName = () => {
    if (editingTeamId && editingTeamNameValue.trim()) {
      onUpdateTeamName(editingTeamId, editingTeamNameValue);
    }
    setEditingTeamId(null); setEditingTeamNameValue('');
  };
  const handleDeleteTeamRequest = (teamId: string) => { setTeamToDeleteId(teamId); setShowConfirmDeleteTeam(true); };
  const confirmDeleteTeam = () => {
    if (teamToDeleteId) onDeleteTeam(teamToDeleteId);
    setShowConfirmDeleteTeam(false); setTeamToDeleteId(null);
  };
  const handleOpenAssignModal = (team: Team) => { setTeamToAssignPlayers(team); setIsAssignModalOpen(true); };
  const handleAssignPlayersSave = (teamId: string, assignedPlayerIds: string[]) => {
    onAssignPlayersToTeam(teamId, assignedPlayerIds);
    setIsAssignModalOpen(false);
    setTeamToAssignPlayers(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center text-brand-text-primary-light dark:text-white mb-8">Gestión de Plantillas y Equipos</h1>
      
      <div className={mainSectionClasses}>
        <h2 className={sectionTitleClasses}>Plantilla Global de Jugadores</h2>
        <div className={formSectionClasses}>
          <h3 className="text-lg font-medium text-brand-text-primary-light dark:text-white">Añadir Nuevo Jugador</h3>
          <input 
            type="text" 
            placeholder="Nombre del Jugador (o pegar lista)" 
            value={formPlayerData.name} 
            onChange={(e) => handleFormChange('name', e.target.value)}
            onPaste={handlePlayerNamePaste}
            className={commonInputClasses}
          />
          <input 
            type="text" 
            placeholder="Número (Ej: 7, 23) (opcional)" 
            value={formPlayerData.number} 
            onChange={(e) => handleFormChange('number', e.target.value)} 
            className={commonInputClasses}
          />
          <select value={formPlayerData.position || ''} onChange={(e) => handleFormChange('position', e.target.value)} className={commonInputClasses}>
            <option value="">-- Seleccionar Posición (Opcional) --</option>
            {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
          <div className="flex space-x-2">
            <button onClick={handleAddNewPlayer} className={primaryButtonClasses}><SaveIcon className="w-4 h-4 mr-1"/>Añadir Jugador</button>
            <button onClick={() => setFormPlayerData({name:'',number:'',position: formPlayerData.position})} className={secondaryButtonClasses}><XMarkIcon className="w-4 h-4 mr-1"/>Limpiar</button>
          </div>
        </div>

        <div className={`${formSectionClasses} md:flex md:items-center md:justify-between`}>
            <div className="flex items-center space-x-2">
                <label htmlFor="filterPosition" className="text-sm text-brand-text-secondary-light dark:text-slate-300">Filtrar:</label>
                <select id="filterPosition" value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className={commonSelectClasses}>
                    <option value="">Todas las Posiciones</option>
                    {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
            </div>
            <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <label htmlFor="sortKey" className="text-sm text-brand-text-secondary-light dark:text-slate-300">Ordenar:</label>
                <select id="sortKey" value={sortConfig.key} onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value as SortKey }))} className={commonSelectClasses}>
                    <option value="manual">Orden Manual</option><option value="name">Nombre</option><option value="number">Número</option><option value="position">Posición</option>
                </select>
                <button onClick={toggleSortDirection} disabled={sortConfig.key === 'manual'} className={`p-1.5 text-brand-text-secondary-light dark:text-slate-300 hover:text-brand-text-primary-light dark:hover:text-white bg-slate-200 dark:bg-slate-700 rounded border border-brand-border-light dark:border-slate-600 disabled:opacity-50`}>
                    {sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
        
        <button
          onClick={() => setIsPlayerListOpen(!isPlayerListOpen)}
          className={listToggleButtonClasses}
          aria-expanded={isPlayerListOpen}
        >
          {isPlayerListOpen ? 'Ocultar Lista de Jugadores' : 'Ver Lista de Jugadores'} ({sortedAndFilteredPlayers.length})
          {isPlayerListOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>

        {isPlayerListOpen && (
          <div className="space-y-3 mt-4">
              {players.length === 0 && <p className="text-center text-brand-text-secondary-light dark:text-slate-400 mt-8">No hay jugadores en la plantilla global.</p>}
              {sortedAndFilteredPlayers.length === 0 && players.length > 0 && <p className="text-center text-brand-text-secondary-light dark:text-slate-400 mt-8">Ningún jugador coincide con los filtros.</p>}
              {sortedAndFilteredPlayers.map((player, index) => (
                  <PlayerRow key={player.id} player={player} rowIndex={index} isEditing={editingPlayerId === player.id} editFormData={editingPlayerId === player.id ? editRowData : {}}
                      onEditFieldChange={handleEditRowFieldChange} onSaveEdit={handleSaveEditRow} onCancelEdit={handleCancelEditRow}
                      onStartEdit={handleStartEditRow} onDelete={handleDeletePlayerRequest} onMoveUp={(id) => movePlayer(id, 'up')} onMoveDown={(id) => movePlayer(id, 'down')}
                      isFirst={sortConfig.key === 'manual' && index === 0} 
                      isLast={sortConfig.key === 'manual' && index === sortedAndFilteredPlayers.length - 1}
                      isSortManual={sortConfig.key === 'manual'}
                  />
              ))}
          </div>
        )}
      </div>

      <div className={mainSectionClasses}>
        <h2 className={sectionTitleClasses}>Equipos</h2>
        <div className={formSectionClasses}>
          <h3 className="text-lg font-medium text-brand-text-primary-light dark:text-white">Crear Nuevo Equipo</h3>
          <input type="text" placeholder="Nombre del Nuevo Equipo" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className={commonInputClasses}/>
          <button onClick={handleOpenCreateTeamModal} className={`w-full ${primaryButtonClasses}`}><PlusIcon className="w-4 h-4 mr-1"/>Crear Equipo y Asignar Jugadores</button>
        </div>

        <button
          onClick={() => setIsTeamListOpen(!isTeamListOpen)}
          className={listToggleButtonClasses}
          aria-expanded={isTeamListOpen}
        >
          {isTeamListOpen ? 'Ocultar Lista de Equipos' : 'Ver Lista de Equipos'} ({teams.length})
          {isTeamListOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>

        {isTeamListOpen && (
          <div className="space-y-3 mt-4">
            {teams.length === 0 && <p className="text-center text-brand-text-secondary-light dark:text-slate-400">No hay equipos creados.</p>}
            {teams.map(team => (
              <div key={team.id} className="bg-brand-surface-light dark:bg-brand-surface p-3 rounded-md shadow">
                {editingTeamId === team.id ? (
                  <div className="flex items-center space-x-2">
                    <input type="text" value={editingTeamNameValue} onChange={(e) => setEditingTeamNameValue(e.target.value)} className={`flex-grow ${commonInputClasses}`}/>
                    <button onClick={handleSaveTeamName} className="p-2 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"><SaveIcon className="w-4 h-4" /></button>
                    <button onClick={() => setEditingTeamId(null)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-brand-text-primary-light dark:text-white font-semibold">{team.name}</span>
                      <span className="text-xs text-brand-text-secondary-light dark:text-slate-400 ml-2">({team.playerIds.length} jugadores)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleStartEditTeamName(team)} className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" aria-label="Editar Nombre"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleOpenAssignModal(team)} className="p-1 text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300" aria-label="Gestionar Jugadores"><UsersIcon className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteTeamRequest(team.id)} className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" aria-label="Eliminar Equipo"><DeleteIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          to="/setup"
          className="w-full flex items-center justify-center px-6 py-2.5 text-sm bg-brand-accent-light dark:bg-brand-accent hover:bg-opacity-80 text-white font-semibold rounded-md shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent-light dark:focus:ring-brand-accent focus:ring-opacity-75"
        >
          <BasketballIcon className="w-4 h-4 mr-1" />
          Ir a Configurar Partido
        </Link>
      </div>

      <ConfirmDialog isOpen={showConfirmDeletePlayer} onClose={() => setShowConfirmDeletePlayer(false)} onConfirm={confirmDeletePlayer} title="Confirmar Eliminación de Jugador">
        ¿Estás seguro de que quieres eliminar a este jugador de la plantilla global? También será eliminado de todos los equipos.
      </ConfirmDialog>
      <ConfirmDialog isOpen={showConfirmDeleteTeam} onClose={() => setShowConfirmDeleteTeam(false)} onConfirm={confirmDeleteTeam} title="Confirmar Eliminación de Equipo">
        ¿Estás seguro de que quieres eliminar este equipo? Los jugadores asignados no serán eliminados de la plantilla global.
      </ConfirmDialog>
      {teamToAssignPlayers && (
        <TeamPlayersAssignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => { setIsAssignModalOpen(false); setTeamToAssignPlayers(null); }}
          team={teamToAssignPlayers}
          allPlayers={players}
          allTeams={teams}
          onAssignPlayers={handleAssignPlayersSave}
        />
      )}
      {isCreateTeamModalOpen && (
        <CreateTeamWithPlayersModal
          isOpen={isCreateTeamModalOpen}
          onClose={() => {
            setIsCreateTeamModalOpen(false);
            setPendingTeamNameForCreation('');
            setNewTeamName('');
          }}
          teamName={pendingTeamNameForCreation}
          allPlayers={players}
          allTeams={teams}
          onConfirm={handleConfirmCreateTeamWithPlayers}
        />
      )}
      <AlertDialog
        isOpen={alertInfo.isOpen}
        onClose={() => setAlertInfo({ isOpen: false, title: '', message: '' })}
        title={alertInfo.title}
      >
        {alertInfo.message}
      </AlertDialog>
    </div>
  );
};

export default RosterManagementPage;
