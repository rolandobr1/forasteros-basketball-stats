
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Player, Team } from '../types';
import { PLAYER_POSITIONS } from '../constants';
import { PlusIcon, EditIcon, DeleteIcon, SaveIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, BasketballIcon, CheckCircleIcon, CircleIcon } from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamPlayersAssignmentModal from '../components/TeamPlayersAssignmentModal';
import CreateTeamWithPlayersModal from '../components/CreateTeamWithPlayersModal';
import AlertDialog from '../components/AlertDialog';

interface RosterManagementPageProps {
  players: Player[];
  onAddPlayer: (player: Omit<Player, 'id' | 'position'> & { position?: string }) => void;
  onAddPlayersBatch: (playersData: Array<Omit<Player, 'id' | 'position'> & { position?: string }>) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onReorderPlayers: (players: Player[]) => void;
  teams: Team[];
  onAddTeam: (name: string, playerIds?: string[]) => void;
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
  rowIndex: number;
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
  isSelected: boolean;
  onToggleSelect: (playerId: string) => void;
  isBulkSelectionActive: boolean;
}> = React.memo(({ 
  player, rowIndex, isEditing, editFormData, onEditFieldChange, 
  onSaveEdit, onCancelEdit, onStartEdit, onDelete, 
  onMoveUp, onMoveDown, isFirst, isLast, isSortManual,
  isSelected, onToggleSelect, isBulkSelectionActive
}) => {
  const longPressTimerRef = useRef<number | null>(null);
  const pressStartPointRef = useRef<{ x: number, y: number } | null>(null);
  const wasLongPressRef = useRef(false);
  const LONG_PRESS_DURATION = 500;
  const MOVE_THRESHOLD = 10;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePressStart = useCallback((clientX: number, clientY: number) => {
    if (isEditing) return;
    clearLongPressTimer();
    wasLongPressRef.current = false;
    pressStartPointRef.current = { x: clientX, y: clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true;
      onToggleSelect(player.id);
    }, LONG_PRESS_DURATION);
  }, [clearLongPressTimer, player.id, onToggleSelect, isEditing, LONG_PRESS_DURATION]);

  const handlePressMove = useCallback((clientX: number, clientY: number) => {
    if (!pressStartPointRef.current || !longPressTimerRef.current) return;
    const deltaX = Math.abs(clientX - pressStartPointRef.current.x);
    const deltaY = Math.abs(clientY - pressStartPointRef.current.y);
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      clearLongPressTimer();
      pressStartPointRef.current = null; 
    }
  }, [clearLongPressTimer, MOVE_THRESHOLD]);
  
  const handlePressEnd = useCallback(() => {
    clearLongPressTimer();
    setTimeout(() => { wasLongPressRef.current = false; }, 50);
  }, [clearLongPressTimer]);


  useEffect(() => {
    return () => clearLongPressTimer(); 
  }, [clearLongPressTimer]);

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-brand-surface p-3 rounded-md shadow-lg space-y-2">
        <input
          type="text"
          value={editFormData.name || ''}
          onChange={(e) => onEditFieldChange('name', e.target.value)}
          placeholder="Nombre"
          className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"
        />
        <input
          type="text"
          value={editFormData.number || ''}
          onChange={(e) => onEditFieldChange('number', e.target.value)}
          placeholder="Número"
          className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"
        />
        <select
          value={editFormData.position || ''}
          onChange={(e) => onEditFieldChange('position', e.target.value)}
          className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"
        >
          <option value="">-- Sin Posición --</option>
          {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
        </select>
        <div className="flex space-x-2 justify-end">
          <button onClick={onSaveEdit} className="p-2 text-green-500 hover:text-green-400 dark:text-green-400 dark:hover:text-green-300"><SaveIcon className="w-4 h-4" /></button>
          <button onClick={onCancelEdit} className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-between bg-white dark:bg-brand-surface p-3 rounded-md shadow hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-brand-accent dark:ring-red-500' : ''}`}
      onTouchStartCapture={(e) => handlePressStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMoveCapture={(e) => handlePressMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEndCapture={handlePressEnd}
      onMouseDownCapture={(e) => {
        if (e.button === 0 && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement && (e.target as HTMLInputElement).type === 'checkbox') && !(e.target instanceof SVGElement)) {
          handlePressStart(e.clientX, e.clientY);
        }
      }}
      onMouseMoveCapture={(e) => handlePressMove(e.clientX, e.clientY)}
      onMouseUpCapture={(e) => { if (e.button === 0) handlePressEnd();}}
      onMouseLeave={handlePressEnd} 
    >
      <input 
        type="checkbox"
        checked={isSelected}
        onChange={(e) => { e.stopPropagation(); onToggleSelect(player.id);}}
        onClick={(e) => e.stopPropagation()} 
        className="form-checkbox h-5 w-5 text-brand-accent bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-brand-accent focus:ring-offset-white dark:focus:ring-offset-brand-surface mr-3 flex-shrink-0"
        aria-label={`Seleccionar jugador ${player.name}`}
      />
      <div className="flex items-center space-x-3 flex-grow min-w-0">
        <span className="text-gray-500 dark:text-slate-400 font-medium w-8 text-right flex-shrink-0">{rowIndex + 1}.</span>
        <div className="truncate flex-grow">
            <span className="text-gray-800 dark:text-white block truncate">{player.name}</span>
            {player.position && <span className="text-xs text-gray-500 dark:text-slate-400 block truncate">{player.position}</span>}
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
        <span className="text-gray-800 dark:text-white font-semibold w-12 text-center">{player.number ? `#${player.number}`: '-'}</span>
        {isSortManual && (
          <>
            <button
              onClick={() => onMoveUp(player.id)}
              disabled={isFirst || isBulkSelectionActive}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white disabled:opacity-30"
              aria-label="Mover arriba"
            >
              <ChevronUpIcon className="w-4 h-4"/>
            </button>
            <button
              onClick={() => onMoveDown(player.id)}
              disabled={isLast || isBulkSelectionActive}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white disabled:opacity-30"
              aria-label="Mover abajo"
            >
              <ChevronDownIcon className="w-4 h-4"/>
            </button>
          </>
        )}
        <button onClick={(e) => { e.stopPropagation(); onStartEdit(player);}} className="p-1 text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-30" aria-label="Editar" disabled={isBulkSelectionActive}>
          <EditIcon className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(player.id);}} className="p-1 text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-30" aria-label="Eliminar" disabled={isBulkSelectionActive}>
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});


const RosterManagementPage: React.FC<RosterManagementPageProps> = React.memo(({
  players, onAddPlayer, onAddPlayersBatch, onUpdatePlayer, onDeletePlayer, onReorderPlayers,
  teams, onAddTeam, onUpdateTeamName, onDeleteTeam, onAssignPlayersToTeam,
}) => {
  const [isPlayerListOpen, setIsPlayerListOpen] = useState(false);
  const [isTeamListOpen, setIsTeamListOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [formPlayerData, setFormPlayerData] = useState<Omit<Player, 'id'>>({ name: '', number: '', position: ''});
  const [editRowData, setEditRowData] = useState<Partial<Player>>({});
  
  const [playerToDeleteId, setPlayerToDeleteId] = useState<string | null>(null); 
  const [showConfirmDeletePlayer, setShowConfirmDeletePlayer] = useState(false);

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

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [showConfirmBulkDelete, setShowConfirmBulkDelete] = useState(false);

  const handleFormChange = useCallback((field: keyof Omit<Player, 'id'>, value: string) => setFormPlayerData(prev => ({ ...prev, [field]: value })), []);
  const handleEditRowFieldChange = useCallback((field: keyof Player, value: string) => setEditRowData(prev => ({ ...prev, [field]: value })), []);

  const generateSingleUniqueNumber = useCallback(() => {
    const existingNumbers = players.map(p => p.number);
    let numericCounter = 1;
    while(existingNumbers.includes(String(numericCounter))) numericCounter++;
    return String(numericCounter);
  }, [players]);

  const handleAddNewPlayer = useCallback(() => {
    let { name, number, position } = formPlayerData; name = name.trim(); number = number.trim();
    if (!name) {
        const firstName = RANDOM_FIRST_NAMES[Math.floor(Math.random() * RANDOM_FIRST_NAMES.length)];
        const lastName = RANDOM_LAST_NAMES[Math.floor(Math.random() * RANDOM_LAST_NAMES.length)];
        name = `${firstName} ${lastName}`;
    }
    if (!number) number = generateSingleUniqueNumber();
    if (number && !/^[a-zA-Z0-9]+$/.test(number)) {
        setAlertInfo({ isOpen: true, title: "Error de Formato", message: "El número de jugador solo puede contener letras y números."}); return;
    }
    onAddPlayer({ name, number, position }); setFormPlayerData({ name: '', number: '', position: position }); 
  }, [formPlayerData, onAddPlayer, generateSingleUniqueNumber]);

  const handlePlayerNamePaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text');
    const lines = pastedText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
    if (lines.length > 0) {
      event.preventDefault(); const batchToAdd: Array<Omit<Player, 'id' | 'position'> & { position?: string }> = [];
      const usedNumbersInThisOperation = new Set(players.map(p => p.number)); let numericCounter = 1; 
      lines.forEach(lineContent => {
        let name = lineContent.trim();
        while (usedNumbersInThisOperation.has(String(numericCounter))) numericCounter++;
        const newNumber = String(numericCounter); usedNumbersInThisOperation.add(newNumber); 
        if (!name) { 
            const firstName = RANDOM_FIRST_NAMES[Math.floor(Math.random() * RANDOM_FIRST_NAMES.length)];
            const lastName = RANDOM_LAST_NAMES[Math.floor(Math.random() * RANDOM_LAST_NAMES.length)];
            name = `${firstName} ${lastName}`;
        }
        batchToAdd.push({ name, number: newNumber, position: formPlayerData.position });
      });
      if (batchToAdd.length > 0) onAddPlayersBatch(batchToAdd);
      setFormPlayerData(prev => ({ ...prev, name: '', number: '' })); 
    }
  }, [players, onAddPlayersBatch, formPlayerData.position]);

  const handleStartEditRow = useCallback((player: Player) => { 
    if (selectedPlayerIds.size > 0) return; 
    setEditingPlayerId(player.id); 
    setEditRowData({ name: player.name, number: player.number, position: player.position }); 
  }, [selectedPlayerIds.size]);

  const handleSaveEditRow = useCallback(() => {
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
  }, [editingPlayerId, players, editRowData, onUpdatePlayer]);
  
  const handleCancelEditRow = useCallback(() => { setEditingPlayerId(null); setEditRowData({}); }, []);
  
  const handleDeletePlayerRequest = useCallback((playerId: string) => { 
    if (selectedPlayerIds.size > 0) return; 
    setPlayerToDeleteId(playerId); 
    setShowConfirmDeletePlayer(true); 
  }, [selectedPlayerIds.size]);

  const confirmDeletePlayer = useCallback(() => {
    if (playerToDeleteId) onDeletePlayer(playerToDeleteId);
    if (editingPlayerId === playerToDeleteId) handleCancelEditRow();
    setShowConfirmDeletePlayer(false); setPlayerToDeleteId(null);
  }, [playerToDeleteId, editingPlayerId, onDeletePlayer, handleCancelEditRow]);
  
  const movePlayer = useCallback((playerId: string, direction: 'up' | 'down') => {
    if (selectedPlayerIds.size > 0) return; 
    const index = players.findIndex(p => p.id === playerId); if (index === -1) return;
    const newPlayersList = [...players]; const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlayersList.length) return;
    [newPlayersList[index], newPlayersList[targetIndex]] = [newPlayersList[targetIndex], newPlayersList[index]];
    onReorderPlayers(newPlayersList); setSortConfig({ key: 'manual', direction: 'ascending' }); 
  }, [players, onReorderPlayers, selectedPlayerIds.size]);

  const sortedAndFilteredPlayers = useMemo(() => {
    let filtered = [...players];
    if (filterPosition) filtered = filtered.filter(player => player.position === filterPosition);
    if (sortConfig.key !== 'manual') {
      filtered.sort((a, b) => {
        let valA = '', valB = '';
        switch (sortConfig.key) {
          case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
          case 'number':
            const numAIsNaN = isNaN(parseInt(a.number, 10)); const numBIsNaN = isNaN(parseInt(b.number, 10));
            if (!numAIsNaN && !numBIsNaN) return sortConfig.direction === 'ascending' ? parseInt(a.number, 10) - parseInt(b.number, 10) : parseInt(b.number, 10) - parseInt(a.number, 10);
            if (numAIsNaN && !numBIsNaN) return 1; if (!numAIsNaN && numBIsNaN) return -1;
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

  const toggleSortDirection = useCallback(() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' })), []);

  const handleToggleSelectPlayer = useCallback((playerId: string) => {
    setSelectedPlayerIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(playerId)) newSelected.delete(playerId);
      else newSelected.add(playerId);
      return newSelected;
    });
    setEditingPlayerId(null); 
  }, []);

  const allFilteredPlayersSelected = useMemo(() => 
    sortedAndFilteredPlayers.length > 0 && sortedAndFilteredPlayers.every(p => selectedPlayerIds.has(p.id)),
    [sortedAndFilteredPlayers, selectedPlayerIds]
  );

  const handleToggleSelectAllFiltered = useCallback(() => {
    if (allFilteredPlayersSelected) {
      setSelectedPlayerIds(new Set());
    } else {
      const allFilteredIds = new Set(sortedAndFilteredPlayers.map(p => p.id));
      setSelectedPlayerIds(allFilteredIds);
    }
  }, [allFilteredPlayersSelected, sortedAndFilteredPlayers]);

  const handleRequestBulkDelete = useCallback(() => {
    if (selectedPlayerIds.size > 0) setShowConfirmBulkDelete(true);
  }, [selectedPlayerIds.size]);

  const confirmBulkDelete = useCallback(() => {
    selectedPlayerIds.forEach(id => onDeletePlayer(id));
    setSelectedPlayerIds(new Set());
    setShowConfirmBulkDelete(false);
  }, [selectedPlayerIds, onDeletePlayer]);

  const handleOpenCreateTeamModal = useCallback(() => { 
    const trimmedName = newTeamName.trim();
    if (!trimmedName) { setAlertInfo({ isOpen: true, title: "Nombre Requerido", message: "El nombre del equipo no puede estar vacío." }); return; }
    if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) { setAlertInfo({ isOpen: true, title: "Nombre Duplicado", message: "Ya existe un equipo con este nombre." }); return; }
    setPendingTeamNameForCreation(trimmedName); setIsCreateTeamModalOpen(true);
  }, [newTeamName, teams]);

  const handleConfirmCreateTeamWithPlayers = useCallback((selectedPlayerIds: string[]) => { 
    onAddTeam(pendingTeamNameForCreation, selectedPlayerIds); setNewTeamName(''); setIsCreateTeamModalOpen(false); setPendingTeamNameForCreation('');
  }, [onAddTeam, pendingTeamNameForCreation]);

  const handleStartEditTeamName = useCallback((team: Team) => { setEditingTeamId(team.id); setEditingTeamNameValue(team.name); }, []);
  
  const handleSaveTeamName = useCallback(() => { 
    if (editingTeamId && editingTeamNameValue.trim()) onUpdateTeamName(editingTeamId, editingTeamNameValue);
    setEditingTeamId(null); setEditingTeamNameValue('');
  }, [editingTeamId, editingTeamNameValue, onUpdateTeamName]);

  const handleDeleteTeamRequest = useCallback((teamId: string) => { setTeamToDeleteId(teamId); setShowConfirmDeleteTeam(true); }, []);
  
  const confirmDeleteTeam = useCallback(() => { if (teamToDeleteId) onDeleteTeam(teamToDeleteId); setShowConfirmDeleteTeam(false); setTeamToDeleteId(null); }, [teamToDeleteId, onDeleteTeam]);
  
  const handleOpenAssignModal = useCallback((team: Team) => { setTeamToAssignPlayers(team); setIsAssignModalOpen(true); }, []);
  
  const handleAssignPlayersSave = useCallback((teamId: string, assignedPlayerIds: string[]) => { 
    onAssignPlayersToTeam(teamId, assignedPlayerIds); setIsAssignModalOpen(false); setTeamToAssignPlayers(null);
  }, [onAssignPlayersToTeam]);

  const handleCloseConfirmDeletePlayer = useCallback(() => setShowConfirmDeletePlayer(false), []);
  const handleCloseConfirmBulkDelete = useCallback(() => setShowConfirmBulkDelete(false), []);
  const handleCloseConfirmDeleteTeam = useCallback(() => setShowConfirmDeleteTeam(false), []);
  const handleCloseAssignModal = useCallback(() => { setIsAssignModalOpen(false); setTeamToAssignPlayers(null); }, []);
  const handleCloseCreateTeamModal = useCallback(() => { setIsCreateTeamModalOpen(false); setPendingTeamNameForCreation(''); setNewTeamName(''); }, []);
  const handleCloseAlert = useCallback(() => setAlertInfo({ isOpen: false, title: '', message: '' }), []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Gestión de Plantillas y Equipos</h1>
      
      <div className="bg-gray-50 dark:bg-brand-dark p-4 rounded-lg shadow-xl space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Plantilla Global de Jugadores</h2>
        <div className="bg-white dark:bg-brand-surface p-4 rounded-lg shadow-md space-y-3">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white">Añadir Nuevo Jugador</h3>
          <input type="text" placeholder="Nombre del Jugador (o pegar lista)" value={formPlayerData.name} onChange={(e) => handleFormChange('name', e.target.value)} onPaste={handlePlayerNamePaste}
            className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"/>
          <input type="text" placeholder="Número (Ej: 7, 23) (opcional)" value={formPlayerData.number} onChange={(e) => handleFormChange('number', e.target.value)} 
            className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"/>
          <select value={formPlayerData.position || ''} onChange={(e) => handleFormChange('position', e.target.value)} 
            className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto">
            <option value="">-- Seleccionar Posición (Opcional) --</option>
            {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
          <div className="flex space-x-2">
            <button onClick={handleAddNewPlayer} className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-500 flex items-center justify-center"><SaveIcon className="w-4 h-4 mr-1"/>Añadir Jugador</button>
            <button onClick={() => setFormPlayerData({name:'',number:'',position: formPlayerData.position})} className="flex-1 px-3 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-400 dark:bg-slate-500 dark:hover:bg-slate-400 flex items-center justify-center"><XMarkIcon className="w-4 h-4 mr-1"/>Limpiar</button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-brand-surface p-3 rounded-md shadow space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
            <div className="flex items-center space-x-2">
                <label htmlFor="filterPosition" className="text-sm text-gray-600 dark:text-slate-300">Filtrar:</label>
                <select id="filterPosition" value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} 
                  className="p-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white text-sm border border-gray-300 dark:border-slate-600 focus:border-brand-accent">
                    <option value="">Todas las Posiciones</option>
                    {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
            </div>
            <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <label htmlFor="sortKey" className="text-sm text-gray-600 dark:text-slate-300">Ordenar:</label>
                <select id="sortKey" value={sortConfig.key} onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value as SortKey }))} 
                  className="p-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white text-sm border border-gray-300 dark:border-slate-600 focus:border-brand-accent">
                    <option value="manual">Orden Manual</option><option value="name">Nombre</option><option value="number">Número</option><option value="position">Posición</option>
                </select>
                <button onClick={toggleSortDirection} disabled={sortConfig.key === 'manual'} 
                  className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white bg-gray-100 dark:bg-slate-700 rounded border border-gray-300 dark:border-slate-600 disabled:opacity-50">
                    {sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
        
        {selectedPlayerIds.size > 0 && (
          <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-md shadow-md flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedPlayerIds.size} jugador(es) seleccionado(s)
            </span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleToggleSelectAllFiltered} 
                className="p-1.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-white rounded flex items-center"
              >
                {allFilteredPlayersSelected ? <CheckCircleIcon className="w-4 h-4 mr-1 text-blue-500"/> : <CircleIcon className="w-4 h-4 mr-1"/>}
                {allFilteredPlayersSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos (Filtrados)'}
              </button>
              <button 
                onClick={handleRequestBulkDelete} 
                className="p-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded flex items-center"
              >
                <DeleteIcon className="w-3.5 h-3.5 mr-1"/>Eliminar Seleccionados
              </button>
            </div>
          </div>
        )}

        <button onClick={() => setIsPlayerListOpen(!isPlayerListOpen)} 
          className="w-full flex justify-between items-center p-2.5 bg-white dark:bg-brand-surface hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-800 dark:text-white font-semibold text-base focus:outline-none" aria-expanded={isPlayerListOpen}>
          {isPlayerListOpen ? 'Ocultar Lista de Jugadores' : 'Ver Lista de Jugadores'} ({sortedAndFilteredPlayers.length})
          {isPlayerListOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>

        {isPlayerListOpen && (
          <div className="space-y-3 mt-4">
              {players.length === 0 && <p className="text-center text-gray-500 dark:text-slate-400 mt-8">No hay jugadores en la plantilla global.</p>}
              {sortedAndFilteredPlayers.length === 0 && players.length > 0 && <p className="text-center text-gray-500 dark:text-slate-400 mt-8">Ningún jugador coincide con los filtros.</p>}
              {sortedAndFilteredPlayers.map((player, index) => (
                  <PlayerRow 
                    key={player.id} 
                    player={player} 
                    rowIndex={index} 
                    isEditing={editingPlayerId === player.id} 
                    editFormData={editingPlayerId === player.id ? editRowData : {}}
                    onEditFieldChange={handleEditRowFieldChange} 
                    onSaveEdit={handleSaveEditRow} 
                    onCancelEdit={handleCancelEditRow}
                    onStartEdit={handleStartEditRow} 
                    onDelete={handleDeletePlayerRequest} 
                    onMoveUp={(id) => movePlayer(id, 'up')} 
                    onMoveDown={(id) => movePlayer(id, 'down')}
                    isFirst={sortConfig.key === 'manual' && index === 0} 
                    isLast={sortConfig.key === 'manual' && index === sortedAndFilteredPlayers.length - 1}
                    isSortManual={sortConfig.key === 'manual'}
                    isSelected={selectedPlayerIds.has(player.id)}
                    onToggleSelect={handleToggleSelectPlayer}
                    isBulkSelectionActive={selectedPlayerIds.size > 0}
                  />
              ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-brand-dark p-4 rounded-lg shadow-xl space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Equipos</h2>
        <div className="bg-white dark:bg-brand-surface p-4 rounded-lg shadow-md space-y-3">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white">Crear Nuevo Equipo</h3>
          <input type="text" placeholder="Nombre del Nuevo Equipo" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} 
            className="w-full p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"/>
          <button onClick={handleOpenCreateTeamModal} className="w-full px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-500 flex items-center justify-center"><PlusIcon className="w-4 h-4 mr-1"/>Crear Equipo y Asignar Jugadores</button>
        </div>

        <button onClick={() => setIsTeamListOpen(!isTeamListOpen)} 
          className="w-full flex justify-between items-center p-2.5 bg-white dark:bg-brand-surface hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-800 dark:text-white font-semibold text-base focus:outline-none" aria-expanded={isTeamListOpen}>
          {isTeamListOpen ? 'Ocultar Lista de Equipos' : 'Ver Lista de Equipos'} ({teams.length})
          {isTeamListOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>

        {isTeamListOpen && (
          <div className="space-y-3 mt-4">
            {teams.length === 0 && <p className="text-center text-gray-500 dark:text-slate-400">No hay equipos creados.</p>}
            {teams.map(team => (
              <div key={team.id} className="bg-white dark:bg-brand-surface p-3 rounded-md shadow">
                {editingTeamId === team.id ? (
                  <div className="flex items-center space-x-2">
                    <input type="text" value={editingTeamNameValue} onChange={(e) => setEditingTeamNameValue(e.target.value)} 
                      className="flex-grow p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent select-auto"/>
                    <button onClick={handleSaveTeamName} className="p-2 text-green-500 hover:text-green-400 dark:text-green-400 dark:hover:text-green-300"><SaveIcon className="w-4 h-4" /></button>
                    <button onClick={() => setEditingTeamId(null)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-800 dark:text-white font-semibold">{team.name}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">({team.playerIds.length} jugadores)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleStartEditTeamName(team)} className="p-1 text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300" aria-label="Editar Nombre"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleOpenAssignModal(team)} className="p-1 text-purple-500 hover:text-purple-400 dark:text-purple-400 dark:hover:text-purple-300" aria-label="Gestionar Jugadores"><UsersIcon className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteTeamRequest(team.id)} className="p-1 text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300" aria-label="Eliminar Equipo"><DeleteIcon className="w-4 h-4" /></button>
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
          className="w-full flex items-center justify-center px-6 py-2.5 text-sm bg-brand-accent hover:bg-opacity-80 text-white font-semibold rounded-md shadow-lg text-sm bg-green-600 text-white rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-75"
        >
          <BasketballIcon className="w-4 h-4 mr-1" />
          Ir a Configurar Partido
        </Link>
      </div>

      <ConfirmDialog isOpen={showConfirmDeletePlayer} onClose={handleCloseConfirmDeletePlayer} onConfirm={confirmDeletePlayer} title="Confirmar Eliminación de Jugador">
        ¿Estás seguro de que quieres eliminar a este jugador de la plantilla global? También será eliminado de todos los equipos.
      </ConfirmDialog>
       <ConfirmDialog 
        isOpen={showConfirmBulkDelete} 
        onClose={handleCloseConfirmBulkDelete} 
        onConfirm={confirmBulkDelete} 
        title="Confirmar Eliminación Múltiple"
        confirmText={`Eliminar (${selectedPlayerIds.size})`}
      >
        ¿Estás seguro de que quieres eliminar los {selectedPlayerIds.size} jugadores seleccionados? Esta acción no se puede deshacer y también los eliminará de cualquier equipo al que pertenezcan.
      </ConfirmDialog>
      <ConfirmDialog isOpen={showConfirmDeleteTeam} onClose={handleCloseConfirmDeleteTeam} onConfirm={confirmDeleteTeam} title="Confirmar Eliminación de Equipo">
        ¿Estás seguro de que quieres eliminar este equipo? Los jugadores asignados no serán eliminados de la plantilla global.
      </ConfirmDialog>
      {teamToAssignPlayers && (
        <TeamPlayersAssignmentModal isOpen={isAssignModalOpen} onClose={handleCloseAssignModal}
          team={teamToAssignPlayers} allPlayers={players} allTeams={teams} onAssignPlayers={handleAssignPlayersSave} />
      )}
      {isCreateTeamModalOpen && (
        <CreateTeamWithPlayersModal isOpen={isCreateTeamModalOpen} onClose={handleCloseCreateTeamModal}
          teamName={pendingTeamNameForCreation} allPlayers={players} allTeams={teams} onConfirm={handleConfirmCreateTeamWithPlayers} />
      )}
      <AlertDialog isOpen={alertInfo.isOpen} onClose={handleCloseAlert} title={alertInfo.title}>
        {alertInfo.message}
      </AlertDialog>
    </div>
  );
});

export default RosterManagementPage;
