
import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { Player, Team } from '../types'; // Added Team
import { PLAYER_POSITIONS } from '../constants';
import { PlusIcon, EditIcon, DeleteIcon, SaveIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, BasketballIcon } from '../utils'; // Added BasketballIcon
import ConfirmDialog from '../components/ConfirmDialog';
import TeamPlayersAssignmentModal from '../components/TeamPlayersAssignmentModal'; // New Modal

interface RosterManagementPageProps {
  players: Player[];
  onAddPlayer: (player: Omit<Player, 'id' | 'position'> & { position?: string }) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onReorderPlayers: (players: Player[]) => void;
  teams: Team[];
  onAddTeam: (name: string) => void;
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
}> = React.memo(({ 
  player, isEditing, editFormData, onEditFieldChange, 
  onSaveEdit, onCancelEdit, onStartEdit, onDelete, 
  onMoveUp, onMoveDown, isFirst, isLast 
}) => {
  if (isEditing) {
    return (
      <div className="bg-brand-surface p-3 rounded-md shadow-lg space-y-2">
        <input
          type="text"
          value={editFormData.name || ''}
          onChange={(e) => onEditFieldChange('name', e.target.value)}
          placeholder="Nombre"
          className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"
        />
        <input
          type="text"
          value={editFormData.number || ''}
          onChange={(e) => onEditFieldChange('number', e.target.value)}
          placeholder="Número"
          className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"
        />
        <select
          value={editFormData.position || ''}
          onChange={(e) => onEditFieldChange('position', e.target.value)}
          className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"
        >
          <option value="">-- Sin Posición --</option>
          {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
        </select>
        <div className="flex space-x-2 justify-end">
          <button onClick={onSaveEdit} className="p-2 text-green-400 hover:text-green-300"><SaveIcon /></button>
          <button onClick={onCancelEdit} className="p-2 text-slate-400 hover:text-white"><XMarkIcon /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-brand-surface p-3 rounded-md shadow hover:shadow-lg transition-shadow">
      <div className="flex items-center space-x-3 flex-grow min-w-0">
        <span className="text-brand-accent font-semibold w-10 text-center flex-shrink-0">#{player.number}</span>
        <div className="truncate flex-grow">
            <span className="text-white block truncate">{player.name}</span>
            {player.position && <span className="text-xs text-slate-400 block truncate">{player.position}</span>}
        </div>
      </div>
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          onClick={() => onMoveUp(player.id)}
          disabled={isFirst}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
          aria-label="Mover arriba"
        >
          <ChevronUpIcon className="w-5 h-5"/>
        </button>
        <button
          onClick={() => onMoveDown(player.id)}
          disabled={isLast}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
          aria-label="Mover abajo"
        >
          <ChevronDownIcon className="w-5 h-5"/>
        </button>
        <button onClick={() => onStartEdit(player)} className="p-1 text-blue-400 hover:text-blue-300" aria-label="Editar">
          <EditIcon />
        </button>
        <button onClick={() => onDelete(player.id)} className="p-1 text-red-400 hover:text-red-300" aria-label="Eliminar">
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
});


const RosterManagementPage: React.FC<RosterManagementPageProps> = ({
  players,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onReorderPlayers,
  teams,
  onAddTeam,
  onUpdateTeamName,
  onDeleteTeam,
  onAssignPlayersToTeam,
}) => {
  // Player editing state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [formPlayerData, setFormPlayerData] = useState<Omit<Player, 'id'>>({ name: '', number: '', position: ''});
  const [editRowData, setEditRowData] = useState<Partial<Player>>({});
  const [showConfirmDeletePlayer, setShowConfirmDeletePlayer] = useState(false);
  const [playerToDeleteId, setPlayerToDeleteId] = useState<string | null>(null);
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'manual', direction: 'ascending' });

  // Team editing state
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamNameValue, setEditingTeamNameValue] = useState('');
  const [showConfirmDeleteTeam, setShowConfirmDeleteTeam] = useState(false);
  const [teamToDeleteId, setTeamToDeleteId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [teamToAssignPlayers, setTeamToAssignPlayers] = useState<Team | null>(null);


  // Player form and edit logic
  const handleFormChange = (field: keyof Omit<Player, 'id'>, value: string) => {
    setFormPlayerData(prev => ({ ...prev, [field]: value }));
  };
  const handleEditRowFieldChange = (field: keyof Player, value: string) => {
    setEditRowData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewPlayer = () => {
    let { name, number, position } = formPlayerData;
    if (!name.trim()) {
        const firstName = RANDOM_FIRST_NAMES[Math.floor(Math.random() * RANDOM_FIRST_NAMES.length)];
        const lastName = RANDOM_LAST_NAMES[Math.floor(Math.random() * RANDOM_LAST_NAMES.length)];
        name = `${firstName} ${lastName}`;
    }
    if (!number.trim()) {
        const existingNumbers = players.map(p => parseInt(p.number, 10)).filter(n => !isNaN(n));
        if (existingNumbers.length === 0) number = "1";
        else {
            let maxNumber = Math.max(0, ...existingNumbers); 
            let nextNumber = maxNumber + 1;
            while (players.some(p => p.number === String(nextNumber))) nextNumber++;
            number = String(nextNumber);
        }
    }
    if (formPlayerData.number.trim() !== "" && !/^[a-zA-Z0-9]+$/.test(formPlayerData.number.trim())) {
        alert("El número de jugador solo puede contener letras y números."); return;
    }
    onAddPlayer({ name: name.trim(), number: number.trim(), position });
    setFormPlayerData({ name: '', number: '', position: '' });
  };

  const handleStartEditRow = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditRowData({ name: player.name, number: player.number, position: player.position });
  };

  const handleSaveEditRow = () => {
    if (!editingPlayerId) return;
    const playerToUpdate = players.find(p => p.id === editingPlayerId);
    if (!playerToUpdate || !editRowData.name?.trim() || !editRowData.number?.trim()) {
      alert("Nombre y número son requeridos para editar."); return;
    }
    if (editRowData.number.trim() !== "" && !/^[a-zA-Z0-9]+$/.test(editRowData.number.trim())) {
        alert("El número de jugador solo puede contener letras y números."); return;
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
            const numA = parseInt(a.number, 10), numB = parseInt(b.number, 10);
            if (!isNaN(numA) && !isNaN(numB)) return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
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

  // Team Logic
  const handleCreateTeam = () => {
    onAddTeam(newTeamName);
    setNewTeamName('');
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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-center text-white mb-6">Gestionar Plantilla Global</h2>
        <div className="bg-brand-surface p-4 rounded-lg shadow-md space-y-3">
          <h3 className="text-xl font-medium text-white">Añadir Nuevo Jugador a Plantilla Global</h3>
          <input type="text" placeholder="Nombre del Jugador (opcional)" value={formPlayerData.name} onChange={(e) => handleFormChange('name', e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"/>
          <input type="text" placeholder="Número (Ej: 7, 23) (opcional)" value={formPlayerData.number} onChange={(e) => handleFormChange('number', e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"/>
          <select value={formPlayerData.position || ''} onChange={(e) => handleFormChange('position', e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent">
            <option value="">-- Seleccionar Posición (Opcional) --</option>
            {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
          <div className="flex space-x-2">
            <button onClick={handleAddNewPlayer} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-400 flex items-center justify-center"><SaveIcon className="mr-2"/>Añadir Jugador</button>
            <button onClick={() => setFormPlayerData({name:'',number:'',position:''})} className="flex-1 px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-400 flex items-center justify-center"><XMarkIcon className="mr-2"/>Limpiar</button>
          </div>
        </div>

        <div className="bg-brand-surface p-3 rounded-md shadow space-y-2 md:space-y-0 md:flex md:items-center md:justify-between mt-4">
            <div className="flex items-center space-x-2">
                <label htmlFor="filterPosition" className="text-sm text-slate-300">Filtrar:</label>
                <select id="filterPosition" value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="p-1.5 rounded bg-slate-700 text-white text-sm border border-slate-600 focus:border-brand-accent">
                    <option value="">Todas las Posiciones</option>
                    {PLAYER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
            </div>
            <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <label htmlFor="sortKey" className="text-sm text-slate-300">Ordenar:</label>
                <select id="sortKey" value={sortConfig.key} onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value as SortKey }))} className="p-1.5 rounded bg-slate-700 text-white text-sm border border-slate-600 focus:border-brand-accent">
                    <option value="manual">Orden Manual</option><option value="name">Nombre</option><option value="number">Número</option><option value="position">Posición</option>
                </select>
                <button onClick={toggleSortDirection} className="p-1.5 text-slate-300 hover:text-white bg-slate-700 rounded border border-slate-600">
                    {sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
        <div className="space-y-3 mt-4">
            {players.length === 0 && <p className="text-center text-slate-400 mt-8">No hay jugadores en la plantilla global.</p>}
            {sortedAndFilteredPlayers.length === 0 && players.length > 0 && <p className="text-center text-slate-400 mt-8">Ningún jugador coincide con los filtros.</p>}
            {sortedAndFilteredPlayers.map((player, index) => (
                <PlayerRow key={player.id} player={player} isEditing={editingPlayerId === player.id} editFormData={editingPlayerId === player.id ? editRowData : {}}
                    onEditFieldChange={handleEditRowFieldChange} onSaveEdit={handleSaveEditRow} onCancelEdit={handleCancelEditRow}
                    onStartEdit={handleStartEditRow} onDelete={handleDeletePlayerRequest} onMoveUp={(id) => movePlayer(id, 'up')} onMoveDown={(id) => movePlayer(id, 'down')}
                    isFirst={index === 0} isLast={index === sortedAndFilteredPlayers.length - 1} />
            ))}
        </div>
        <div className="mt-6">
          <Link
            to="/setup"
            className="w-full flex items-center justify-center px-6 py-3 bg-brand-accent hover:bg-opacity-80 text-white font-semibold rounded-md shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-75"
          >
            <BasketballIcon className="w-5 h-5 mr-2" />
            Ir a Configurar Partido
          </Link>
        </div>
      </div>

      <hr className="border-slate-700 my-8" />

      <div>
        <h2 className="text-3xl font-semibold text-center text-white mb-6">Gestionar Equipos</h2>
        <div className="bg-brand-surface p-4 rounded-lg shadow-md space-y-3 mb-6">
          <h3 className="text-xl font-medium text-white">Crear Nuevo Equipo</h3>
          <input type="text" placeholder="Nombre del Nuevo Equipo" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"/>
          <button onClick={handleCreateTeam} className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-400 flex items-center justify-center"><PlusIcon className="mr-2"/>Crear Equipo</button>
        </div>

        <div className="space-y-3">
          {teams.length === 0 && <p className="text-center text-slate-400">No hay equipos creados.</p>}
          {teams.map(team => (
            <div key={team.id} className="bg-brand-surface p-3 rounded-md shadow">
              {editingTeamId === team.id ? (
                <div className="flex items-center space-x-2">
                  <input type="text" value={editingTeamNameValue} onChange={(e) => setEditingTeamNameValue(e.target.value)} className="flex-grow p-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-brand-accent"/>
                  <button onClick={handleSaveTeamName} className="p-2 text-green-400 hover:text-green-300"><SaveIcon /></button>
                  <button onClick={() => setEditingTeamId(null)} className="p-2 text-slate-400 hover:text-white"><XMarkIcon /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">{team.name}</span>
                    <span className="text-xs text-slate-400 ml-2">({team.playerIds.length} jugadores)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleStartEditTeamName(team)} className="p-1 text-blue-400 hover:text-blue-300" aria-label="Editar Nombre"><EditIcon /></button>
                    <button onClick={() => handleOpenAssignModal(team)} className="p-1 text-purple-400 hover:text-purple-300" aria-label="Gestionar Jugadores"><UsersIcon className="w-5 h-5"/></button>
                    <button onClick={() => handleDeleteTeamRequest(team.id)} className="p-1 text-red-400 hover:text-red-300" aria-label="Eliminar Equipo"><DeleteIcon /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
          allTeams={teams} // Pass all teams here
          onAssignPlayers={handleAssignPlayersSave}
        />
      )}
    </div>
  );
};

export default RosterManagementPage;
