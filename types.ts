
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
  quarters: number;
  quarterDuration: number; // in seconds
  overtimeDuration: number; // in seconds
  foulsForBonus: number;
  maxPersonalFouls: number; // Fouls to foul out a player
  allowFoulOuts: boolean; // New setting to enable/disable foul outs
  breakDuration?: number; // Optional: duration for quarter breaks in seconds
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

// Defines an action that occurred during the game (for logging/undo)
export interface GameAction {
  id: string;
  timestamp: number; // Date.now()
  type: 'stat_update' | 'substitution' | 'timer_change' | 'foul_update' | 'score_update';
  payload: any; // Specific details of the action
  teamId?: 'home' | 'away';
  playerId?: string;
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
