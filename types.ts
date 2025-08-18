

// Defines the structure for a player
export interface Player {
  id: string;
  name: string;
  number: string; // Jersey number, can be string like "00"
  position?: string; // Player's position, e.g., Base, Escolta
}

// Defines a team
export interface Team {
  id: string;
  name: string;
  playerIds: string[]; // Array of Player IDs belonging to this team
}

// Defines the types of stats that can be recorded
export enum StatType {
  POINTS_1_MADE = "1PM", // Free Throw Made
  POINTS_1_ATTEMPTED = "1PA", // Free Throw Attempted
  POINTS_2_MADE = "2PM",
  POINTS_2_ATTEMPTED = "2PA",
  POINTS_3_MADE = "3PM",
  POINTS_3_ATTEMPTED = "3PA",
  REBOUNDS_OFFENSIVE = "ORB",
  REBOUNDS_DEFENSIVE = "DRB",
  ASSISTS = "AST",
  STEALS = "STL",
  BLOCKS = "BLK",
  TURNOVERS = "TOV",
  FOULS_PERSONAL = "PF",
}

// Defines the structure for player statistics in a game
export interface PlayerStats {
  [StatType.POINTS_1_MADE]: number;
  [StatType.POINTS_1_ATTEMPTED]: number;
  [StatType.POINTS_2_MADE]: number;
  [StatType.POINTS_2_ATTEMPTED]: number;
  [StatType.POINTS_3_MADE]: number;
  [StatType.POINTS_3_ATTEMPTED]: number;
  [StatType.REBOUNDS_OFFENSIVE]: number;
  [StatType.REBOUNDS_DEFENSIVE]: number;
  [StatType.ASSISTS]: number;
  [StatType.STEALS]: number;
  [StatType.BLOCKS]: number;
  [StatType.TURNOVERS]: number;
  [StatType.FOULS_PERSONAL]: number;
}

export const initialPlayerStats: PlayerStats = {
  [StatType.POINTS_1_MADE]: 0,
  [StatType.POINTS_1_ATTEMPTED]: 0,
  [StatType.POINTS_2_MADE]: 0,
  [StatType.POINTS_2_ATTEMPTED]: 0,
  [StatType.POINTS_3_MADE]: 0,
  [StatType.POINTS_3_ATTEMPTED]: 0,
  [StatType.REBOUNDS_OFFENSIVE]: 0,
  [StatType.REBOUNDS_DEFENSIVE]: 0, // Corrected typo: DEFensive to DEFENSIVE
  [StatType.ASSISTS]: 0,
  [StatType.STEALS]: 0,
  [StatType.BLOCKS]: 0,
  [StatType.TURNOVERS]: 0,
  [StatType.FOULS_PERSONAL]: 0,
};

// Defines team-specific data within a game
export interface TeamGameInfo {
  name: string; // e.g., "Local", "Visitante" or actual team name
  players: Player[]; // Players selected for this team for this game
  onCourt: Player[]; // Players currently on court
  bench: Player[]; // Players currently on bench
  stats: Record<string, PlayerStats>; // PlayerId -> PlayerStats map
  score: number;
  foulsThisQuarter: number;
  timeoutsLeft: number; // Assuming fixed number of timeouts, can be expanded
}

// Defines the settings for a game
export interface GameSettings {
  gameName?: string; // Optional name for the game
  quarters: number;
  quarterDuration: number; // in seconds
  overtimeDuration: number; // in seconds
  foulsForBonus: number;
  maxPersonalFouls: number; // Fouls to foul out a player
  allowFoulOuts: boolean; // New setting to enable/disable foul outs
  breakDuration?: number; // Optional: duration for quarter breaks in seconds
  homeTeam?: { name: string }; // Used in EditGameActionModal for team names
  awayTeam?: { name: string }; // Used in EditGameActionModal for team names
}

// Defines the possible phases of a game
export enum GamePhase {
  NOT_STARTED = "Not Started",
  WARMUP = "Warmup",
  QUARTER_BREAK = "Quarter Break",
  HALFTIME = "Halftime",
  OVERTIME_BREAK = "Overtime Break",
  IN_PROGRESS = "In Progress",
  TIMEOUT = "Timeout",
  FINISHED = "Finished",
}

// Defines the structure for a game
export interface Game {
  id: string;
  settings: GameSettings;
  homeTeam: TeamGameInfo;
  awayTeam: TeamGameInfo;
  currentQuarter: number; // 1-based, or 0 for pre-game/setup
  isOvertime: boolean;
  gamePhase: GamePhase;
  currentTimeRemainingInPhase: number; // Time left in the current phase
  startTime: string | null; // ISO string date when game actually started
  endTime: string | null; // ISO string date when game finished
  gameLog: GameAction[]; // Log of actions for potential undo or detailed review
  winningTeam: 'home' | 'away' | 'tie' | null;
  timerIsRunning: boolean; // Tracks if the timer should be actively counting down
  lastTickTimestamp: number | null; // Timestamp of the last timer update
}


// Payload for GameAction specific to stat updates
export interface StatUpdatePayload {
  teamId: TeamType;
  playerId: string;
  statType: StatType; // e.g. StatType.POINTS_2_MADE
  valueChange: number; // e.g. 1 for increment, -1 for decrement
  pointsChange: number; // e.g. 2 for POINTS_2_MADE, 0 for REBOUNDS_OFFENSIVE
  quarter: number;
  isOvertime: boolean;
  timeRemainingInPhase: number;
  homeScoreAtAction: number;
  awayScoreAtAction: number;
}

// Payload for score updates (more generic, could be used by StatUpdatePayload too)
export interface ScoreUpdatePayload {
  teamId: TeamType;
  playerId: string;
  pointsScored: number; // Actual points added/removed from score (e.g. 2 for 2PM, -2 if correcting 2PM)
  statType?: StatType; // Optional: specific stat that led to score, e.g. POINTS_2_MADE
  quarter: number;
  isOvertime: boolean;
  timeRemainingInPhase: number;
  homeScoreAtAction: number;
  awayScoreAtAction: number;
}

// Payload for foul updates
export interface FoulUpdatePayload {
  teamId: TeamType;
  playerId: string;
  foulsAdded: number; // Can be negative if correcting
  newTotalPersonalFouls: number;
  quarter: number;
  isOvertime: boolean;
  timeRemainingInPhase: number;
  homeScoreAtAction: number;
  awayScoreAtAction: number;
}

// Payload for substitutions
export interface SubstitutionPayload {
  teamId: TeamType;
  playerInId: string;
  playerInName: string;
  playerOutId: string;
  playerOutName: string;
  quarter: number;
  isOvertime: boolean;
  timeRemainingInPhase: number;
  homeScoreAtAction: number;
  awayScoreAtAction: number;
}

// Payload for timer changes
export interface TimerChangePayload {
  phase: GamePhase;
  action: 'started' | 'paused' | 'reset' | 'period_advanced' | 'period_reverted' | 'game_ended';
  quarter: number;
  isOvertime: boolean;
  time?: number; // Current time for started/paused, newTime for reset
  oldTime?: number; // For reset
  newTime?: number; // For reset
  oldQuarter?: number; // For period_advanced/reverted
  newQuarter?: number; // For period_advanced/reverted
  homeScore?: number; // For game_ended and also for homeScoreAtAction context
  awayScore?: number; // For game_ended and also for awayScoreAtAction context
  winningTeam?: 'home' | 'away' | 'tie' | null; // For game_ended
  homeScoreAtAction: number; // Score context for all timer changes
  awayScoreAtAction: number; // Score context for all timer changes
}

// Payload for player added to game team
export interface PlayerAddedToTeamPayload {
  teamId: TeamType;
  playerId: string;
  playerName: string;
  quarter: number;
  isOvertime: boolean;
  timeRemainingInPhase?: number; // Time may not be relevant if added during setup/break
  homeScoreAtAction: number;
  awayScoreAtAction: number;
}


// Defines an action that occurred during the game (for logging/undo)
export interface GameAction {
  id: string;
  timestamp: number; // Date.now()
  type: 'stat_update' | 'substitution' | 'timer_change' | 'foul_update' | 'score_update' | 'player_added_to_team';
  payload: Partial<StatUpdatePayload | ScoreUpdatePayload | FoulUpdatePayload | SubstitutionPayload | TimerChangePayload | PlayerAddedToTeamPayload>;
  teamId?: 'home' | 'away'; // Redundant if in payload, but can keep for quick filtering
  playerId?: string; // Redundant if in payload
  description: string; // Human-readable description
}

export type TeamType = 'home' | 'away';

// Properties for dialogs
export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode; // Made children optional
}

export interface ConfirmDialogProps extends DialogProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertProps extends DialogProps {
  confirmText?: string;
}

export interface PredefinedTeamSelectionModalProps extends Omit<DialogProps, 'title' | 'children'> {
  allTeams: Team[];
  onTeamSelected: (team: Team) => void;
  currentSelectedTeamId?: string;
  title?: string;
}