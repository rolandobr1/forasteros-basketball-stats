
import { GameSettings, StatType } from './types';

export const LOCAL_STORAGE_KEYS = {
  PLAYERS_ROSTER: 'forasteros_playersRoster',
  GAME_HISTORY: 'forasteros_gameHistory',
  CURRENT_GAME: 'forasteros_currentGame',
  TEAMS: 'forasteros_teams', // Added new key for teams
};

export const INITIAL_GAME_SETTINGS: GameSettings = {
  quarters: 4,
  quarterDuration: 10 * 60, // 10 minutes in seconds
  overtimeDuration: 5 * 60, // 5 minutes in seconds
  foulsForBonus: 5, // Fouls per quarter to reach bonus
  maxPersonalFouls: 5, // Fouls for a player to be fouled out
  allowFoulOuts: false, // Players are not fouled out by default
  breakDuration: 60, // 1 minute for quarter breaks
};

export const STAT_TYPE_LABELS: Record<StatType, string> = {
  [StatType.POINTS_1_MADE]: "TL Anotado",
  [StatType.POINTS_1_ATTEMPTED]: "TL Intentado",
  [StatType.POINTS_2_MADE]: "2P Anotado",
  [StatType.POINTS_2_ATTEMPTED]: "2P Intentado",
  [StatType.POINTS_3_MADE]: "3P Anotado",
  [StatType.POINTS_3_ATTEMPTED]: "3P Intentado",
  [StatType.REBOUNDS_OFFENSIVE]: "Rebote Ofensivo",
  [StatType.REBOUNDS_DEFENSIVE]: "Rebote Defensivo",
  [StatType.ASSISTS]: "Asistencia",
  [StatType.STEALS]: "Robo",
  [StatType.BLOCKS]: "Bloqueo",
  [StatType.TURNOVERS]: "Pérdida",
  [StatType.FOULS_PERSONAL]: "Falta Personal",
};

export const POINTS_STATS: StatType[] = [
  StatType.POINTS_1_MADE, StatType.POINTS_1_ATTEMPTED,
  StatType.POINTS_2_MADE, StatType.POINTS_2_ATTEMPTED,
  StatType.POINTS_3_MADE, StatType.POINTS_3_ATTEMPTED,
];

export const OTHER_STATS: StatType[] = [
  StatType.REBOUNDS_OFFENSIVE, StatType.REBOUNDS_DEFENSIVE,
  StatType.ASSISTS, StatType.STEALS, StatType.BLOCKS,
  StatType.TURNOVERS, StatType.FOULS_PERSONAL,
];

export const APP_TITLE = "Forasteros Stats App";
// PLEASE REPLACE THIS URL with your actual transparent logo URL.
// This is a placeholder transparent basketball image.
export const TEAM_PLACEHOLDER_LOGO = "https://i.imgur.com/Wn0F6h5.png"; 
export const FOOTER_TEXT = "Desarrollado por Forasteros";

export const PLAYER_POSITIONS: string[] = [
  "Base", 
  "Escolta", 
  "Alero", 
  "Ala-Pívot", 
  "Pívot",
  "Utility", // Generic position if needed
];
