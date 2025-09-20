export type Status = 'Idle' | 'Lobby' | 'InGame';

export type You = {
  isHost?: boolean;
  role?: 'citizen' | 'impostor';
  word?: string;
};

export type StateMsg = {
  type: 'state';
  data: { status: Status; players: number; maxPlayers: number; gameStarted?: boolean; you?: You };
};

export type ClientMsg =
  | { type: 'hello'; data: { sessionId?: string } }
  | { type: 'claimHost' }
  | { type: 'join' }
  | { type: 'startGame' }
  | { type: 'endGame' }
  | { type: 'leave' };
