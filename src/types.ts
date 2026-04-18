export interface GameState {
  meta: {
    chapter: string;
    location: string;
    soundtrack: string;
  };
  stats: {
    relationshipPoints: number; // 0-100
    tensionLevel: number; // 0-100
    psychotype: 'avoidant' | 'secure' | 'anxious';
  };
  plotFlags: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  state?: GameState;
}

export const INITIAL_STATE: GameState = {
  meta: {
    chapter: "Пролог",
    location: "Спальня",
    soundtrack: "Silence",
  },
  stats: {
    relationshipPoints: 50,
    tensionLevel: 30,
    psychotype: 'secure',
  },
  plotFlags: [],
};
