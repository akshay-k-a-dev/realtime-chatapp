export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  users: string[];
  createdAt: number;
}

export interface TypingStatus {
  [userId: string]: boolean;
}

export interface QueueUser {
  id: string;
  joinedAt: number;
}

export type ThemeMode = 'light' | 'dark';