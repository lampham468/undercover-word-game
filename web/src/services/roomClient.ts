import { WS } from './ws.js';
import type { ConnectionStatus } from './ws.js';
import { getSessionId } from './session.js';
import type { StateMsg, ClientMsg, Status, You } from '../../../packages/shared/src/protocol.js';

// Room state interface matching existing format
export interface RoomState {
  status: Status;
  players: number;
  maxPlayers: number;
  gameStarted?: boolean;
  you?: You;
}

// Event types for room client
export type RoomEvent =
  | { type: 'state'; data: RoomState }
  | { type: 'error'; message: string }
  | { type: 'status'; status: ConnectionStatus };

export type RoomListener = (event: RoomEvent) => void;

export class RoomClient {
  private ws: WS;
  private listeners: RoomListener[] = [];
  private currentState: RoomState = {
    status: 'Idle',
    players: 0,
    maxPlayers: 8
  };

  constructor(wsUrl: string) {
    this.ws = new WS(wsUrl);
    this.setupWebSocketHandlers();
  }

  /**
   * Connect to the room server
   */
  connect(): void {
    this.ws.connect();
  }

  /**
   * Claim host role in the room
   */
  claimHost(): void {
    this.sendCommand({ type: 'claimHost' });
  }

  /**
   * Join the room as a player
   */
  join(): void {
    this.sendCommand({ type: 'join' });
  }

  /**
   * Start the game (host only)
   */
  startGame(): void {
    this.sendCommand({ type: 'startGame' });
  }

  /**
   * End the current game (host only)
   */
  endGame(): void {
    this.sendCommand({ type: 'endGame' });
  }

  /**
   * Leave the room
   */
  leave(): void {
    this.sendCommand({ type: 'leave' });
  }

  /**
   * Add event listener for room events
   * Returns unsubscribe function
   */
  on(fn: RoomListener): () => void {
    this.listeners.push(fn);
    return () => {
      const index = this.listeners.indexOf(fn);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current room state
   */
  getState(): RoomState {
    return { ...this.currentState };
  }

  /**
   * Close the connection
   */
  close(): void {
    this.ws.close();
  }

  private setupWebSocketHandlers(): void {
    // Handle incoming messages
    this.ws.onMessage((data) => {
      this.handleMessage(data);
    });

    // Handle connection status changes
    this.ws.onStatus((status) => {
      this.emit({ type: 'status', status });
    });

    // Send hello message when connected
    this.ws.onConnected(() => {
      this.sendHello();
    });
  }

  private handleMessage(data: unknown): void {
    try {
      // Validate message structure
      if (!data || typeof data !== 'object' || !('type' in data)) {
        return; // Silently ignore invalid messages
      }

      const message = data as { type: string; data?: unknown };

      switch (message.type) {
        case 'state':
          this.handleStateMessage(message as StateMsg);
          break;
        case 'error':
          this.handleErrorMessage(message as { type: 'error'; data: { message: string } });
          break;
        default:
          // Silently ignore unknown message types
          break;
      }
    } catch (error) {
      // Silently ignore message handling errors as per requirements
      console.error('Error handling message:', error);
    }
  }

  private handleStateMessage(message: StateMsg): void {
    // Update current state
    this.currentState = {
      status: message.data.status,
      players: message.data.players,
      maxPlayers: message.data.maxPlayers,
      gameStarted: message.data.gameStarted,
      you: message.data.you
    };

    // Emit state event
    this.emit({ type: 'state', data: this.currentState });
  }

  private handleErrorMessage(message: { type: 'error'; data: { message: string } }): void {
    this.emit({ type: 'error', message: message.data.message });
  }

  private sendCommand(command: Extract<ClientMsg, { type: 'claimHost' | 'join' | 'startGame' | 'endGame' | 'leave' }>): void {
    this.ws.send(command);
  }

  private sendHello(): void {
    const sessionId = getSessionId();
    this.ws.send({
      type: 'hello',
      data: { sessionId }
    });
  }

  private emit(event: RoomEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in room event listener:', error);
      }
    });
  }
}
