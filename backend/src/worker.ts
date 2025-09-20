import type { Status, ClientMsg, StateMsg } from '@undercover/shared';

export interface Env { ROOM: DurableObjectNamespace; }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/ws' && req.headers.get('Upgrade') === 'websocket') {
      const roomName = url.searchParams.get('room') || 'default';
      const id = env.ROOM.idFromName(roomName);
      return env.ROOM.get(id).fetch(req);
    }
    return new Response('OK', { status: 200 });
  },
};

type Phase = 'Idle' | 'Lobby' | 'InGame';

export class RoomDO {
  constructor(_state: DurableObjectState, _env: Env) { }

  private sockets = new Map<string, WebSocket>(); // sessionId -> ws
  private playerStates = new Map<string, Status>(); // sessionId -> where each player is (for individual tracking)

  // Single authoritative state - phase drives everything
  private phase: Phase = 'Idle';

  private hostId: string | null = null;   // Who is the host?
  private impostorId: string | null = null;
  private word: string | null = null;
  private readonly maxPlayers = 8;
  private readonly WORDS = ['ocean', 'piano', 'galaxy', 'pumpkin', 'satellite', 'museum', 'bicycle'];

  // Derived properties computed from authoritative phase and player states
  private get roomClaimed(): boolean {
    return this.phase !== 'Idle';
  }

  private get gameStarted(): boolean {
    return this.phase === 'InGame';
  }

  private get roomSize(): number {
    // Count only players with status !== 'Idle' AND who have active socket connections
    let count = 0;
    for (const [id, status] of this.playerStates) {
      if (status !== 'Idle' && this.sockets.has(id)) {
        count++;
      }
    }
    return count;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });

    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();

    let pid: string | null = null;

    const send = (ws: WebSocket, o: unknown) => { try { ws.send(JSON.stringify(o)); } catch { } };

    // Method to broadcast state to all connected clients
    const broadcastStateAll = () => {
      for (const [id, ws] of this.sockets) {
        sendState(ws, id);
      }
    };

    // Helper functions for clean state management
    const resetRoom = () => {
      this.phase = 'Idle';
      this.hostId = null;
      this.impostorId = null;
      this.word = null;

      // Send everyone back to Idle
      for (const playerId of this.playerStates.keys()) {
        this.playerStates.set(playerId, 'Idle');
      }

      broadcastStateAll();
    };

    const addPlayerToRoom = (playerId: string, isHost: boolean = false) => {
      this.playerStates.set(playerId, 'Lobby');
      if (isHost) {
        this.phase = 'Lobby';
        this.hostId = playerId;
      }
      broadcastStateAll();
    };

    // Unified leave and socket close handling
    const leaveOrClose = (playerId: string) => {
      // If host leaves during any phase, reset entire room
      if (playerId === this.hostId) {
        resetRoom();
        return;
      }

      // If any player leaves during InGame phase, reset entire room
      if (this.phase === 'InGame') {
        resetRoom();
        return;
      }

      // For non-host player leaving during Lobby phase
      if (this.phase === 'Lobby') {
        this.playerStates.set(playerId, 'Idle');
        
        // If lobby becomes empty after player leaves, reset to Idle
        if (this.roomSize === 0) {
          resetRoom();
        } else {
          broadcastStateAll();
        }
      }
    };

    const sendState = (ws: WebSocket, youId?: string) => {
      if (!youId) return;

      // Get or initialize player's state - everyone starts at Idle
      let playerStatus = this.playerStates.get(youId);
      if (!playerStatus) {
        playerStatus = 'Idle';
        this.playerStates.set(youId, playerStatus);
      }

      const you = {
        isHost: this.hostId === youId || undefined,
        role: playerStatus === 'InGame' ? (this.impostorId === youId ? 'impostor' as const : 'citizen' as const) : undefined,
        word: playerStatus === 'InGame' && this.impostorId !== youId ? this.word ?? undefined : undefined,
      };

      const msg: StateMsg = {
        type: 'state',
        data: {
          status: playerStatus,
          players: this.roomSize,
          maxPlayers: this.maxPlayers,
          gameStarted: this.gameStarted,
          you
        }
      };

      console.log(`Sending state to ${youId}:`, {
        status: playerStatus,
        players: this.roomSize,
        gameStarted: this.gameStarted
      });

      send(ws, msg);
    };

    server.addEventListener('message', (ev: MessageEvent) => {
      let msg: ClientMsg; try { msg = JSON.parse(String(ev.data)); } catch { return; }

      if (msg.type === 'hello') {
        pid = msg.data?.sessionId || crypto.randomUUID();
        this.sockets.set(pid, server);
        sendState(server, pid);
        return;
      }
      if (!pid) return;

      switch (msg.type) {
        case 'claimHost':
          // First come, first serve - claim the room
          if (this.phase === 'Idle') {
            addPlayerToRoom(pid, true); // Add as host
          } else {
            send(server, { type: 'error', data: { message: 'Room already claimed' } });
          }
          break;

        case 'join':
          // Can join if room is in Lobby phase, not full
          if (this.phase === 'Lobby' && this.roomSize < this.maxPlayers) {
            addPlayerToRoom(pid, false); // Add as regular player
          } else if (this.phase === 'Idle') {
            send(server, { type: 'error', data: { message: 'No room to join' } });
          } else if (this.roomSize >= this.maxPlayers) {
            send(server, { type: 'error', data: { message: 'Room is full' } });
          } else if (this.phase === 'InGame') {
            send(server, { type: 'error', data: { message: 'Game already started' } });
          }
          break;

        case 'startGame':
          // Only host can start, need at least 3 players
          if (this.hostId !== pid) {
            send(server, { type: 'error', data: { message: 'Only host can start' } });
            break;
          }

          if (this.roomSize < 3) {
            send(server, { type: 'error', data: { message: 'Need at least 3 players' } });
            break;
          }

          // Start the game - transition to InGame phase
          this.phase = 'InGame';
          this.word = this.WORDS[(Math.random() * this.WORDS.length) | 0];

          // Get all players in lobby and pick impostor
          const lobbyPlayers = Array.from(this.playerStates.entries())
            .filter(([_, status]) => status === 'Lobby')
            .map(([id, _]) => id);
          this.impostorId = lobbyPlayers[(Math.random() * lobbyPlayers.length) | 0];

          // Transport everyone to game
          lobbyPlayers.forEach(playerId => {
            this.playerStates.set(playerId, 'InGame');
          });

          broadcastStateAll();
          break;

        case 'endGame':
          // Anyone can end the game
          if (this.phase === 'InGame') {
            resetRoom();
          } else {
            send(server, { type: 'error', data: { message: 'No game in progress' } });
          }
          break;

        case 'leave':
          leaveOrClose(pid);
          break;
      }
    });

    const onClose = () => {
      if (!pid) return;

      this.sockets.delete(pid);
      leaveOrClose(pid);
    };

    server.addEventListener('close', onClose);
    server.addEventListener('error', onClose);

    return new Response(null, { status: 101, webSocket: client });
  }
}
