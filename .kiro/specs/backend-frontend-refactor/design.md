# Design Document

## Overview

This design implements a comprehensive refactor of the Undercover Word Game's architecture, focusing on two main areas: backend state machine simplification and frontend services modularization. The refactor maintains complete API compatibility while improving maintainability, consistency, and separation of concerns.

The backend will transition from multiple boolean flags to a single authoritative phase-based state machine, while the frontend will be restructured into four focused modules: session management, WebSocket transport, room protocol handling, and React integration.

## Architecture

### Backend Architecture

The backend architecture centers around a single authoritative `Phase` enum that drives all state management:

```typescript
type Phase = 'Idle' | 'Lobby' | 'InGame';
type PlayerStatus = 'Idle' | 'Lobby' | 'InGame';
```

**State Management Flow:**
1. **Single Source of Truth**: The `phase` field is the only mutable state variable for room-level state
2. **Derived Properties**: All other properties (`roomClaimed`, `gameStarted`, `roomSize`) are computed from `phase` and player states
3. **Player Tracking**: Individual player states are tracked separately but aligned with the room phase
4. **Immutable Getters**: Derived properties use private getters that cannot be manually mutated

**State Transitions:**
- `Idle` → `Lobby`: When first player claims host
- `Lobby` → `InGame`: When host starts game with ≥3 players  
- `InGame` → `Idle`: When game ends or any player leaves during game
- `Lobby` → `Idle`: When host leaves or lobby becomes empty

### Frontend Architecture

The frontend architecture separates concerns into four distinct modules:

```
web/src/services/
├── session.ts      # Session identity & dev mode management
├── ws.ts          # WebSocket transport & reconnection
├── roomClient.ts  # Room protocol & domain logic
└── useRoom.ts     # React hook orchestration
```

**Module Responsibilities:**

1. **session.ts**: Manages session identity with dev/prod mode switching
2. **ws.ts**: Handles WebSocket lifecycle, reconnection, and message transport
3. **roomClient.ts**: Implements room protocol, command sending, and event handling
4. **useRoom.ts**: Provides React integration and maintains singleton connection

## Components and Interfaces

### Backend Components

#### RoomDO Class Structure

```typescript
export class RoomDO {
  // Transport layer
  private sockets = new Map<string, WebSocket>();
  
  // Authoritative state (single source of truth)
  private phase: Phase = 'Idle';
  private hostId: string | null = null;
  private impostorId: string | null = null;
  private word: string | null = null;
  
  // Per-player tracking
  private players = new Map<string, PlayerStatus>();
  
  // Derived properties (read-only)
  private get roomClaimed() { return this.phase !== 'Idle'; }
  private get gameStarted() { return this.phase === 'InGame'; }
  private get roomSize() { 
    // Count active players with open sockets
    let count = 0;
    for (const [id, status] of this.players) {
      if (status !== 'Idle' && this.sockets.has(id)) count++;
    }
    return count;
  }
}
```

#### State Transition Functions

```typescript
// Unified leave/disconnect handling
const leaveOrClose = (id: string) => {
  if (id === this.hostId || this.phase === 'InGame') {
    reset(); // Reset entire room
  } else {
    // Mark player as Idle, reset if room empty
    this.players.set(id, 'Idle');
    if (this.roomSize === 0) reset();
    else broadcastStateAll();
  }
};

// Clean room reset
const reset = () => {
  this.phase = 'Idle';
  this.hostId = null;
  this.impostorId = null;
  this.word = null;
  for (const id of this.players.keys()) {
    this.players.set(id, 'Idle');
  }
  broadcastStateAll();
};
```

### Frontend Components

#### Session Management (session.ts)

```typescript
export function isDevMode(): boolean;
export function setDevMode(enabled: boolean): void;
export function getSessionId(): string;
```

**Implementation Details:**
- Dev mode: Uses `sessionStorage` for per-tab sessions with "dev_" prefix
- Prod mode: Uses `localStorage` for persistent cross-tab sessions
- Automatic session generation with crypto.randomUUID()

#### WebSocket Transport (ws.ts)

```typescript
export class WS {
  connect(): void;
  send(obj: unknown): void;
  close(): void;
  onMessage(fn: Listener): () => void;
  onStatus(fn: StatusListener): () => void;
}
```

**Implementation Details:**
- Exponential backoff reconnection (250ms → 4s max)
- Automatic reconnection on connection loss
- Status tracking: 'connecting' | 'open' | 'closed' | 'reconnecting' | 'failed'
- Graceful error handling with silent JSON parse failures

#### Room Protocol Client (roomClient.ts)

```typescript
export class RoomClient {
  connect(): void;
  claimHost(): void;
  join(): void;
  startGame(): void;
  endGame(): void;
  leave(): void;
  on(fn: RoomListener): () => void;
}

export type RoomEvent =
  | { type: 'state'; data: RoomState }
  | { type: 'error'; message: string }
  | { type: 'status'; status: ConnectionStatus };
```

**Implementation Details:**
- Automatic hello message sending on connection
- Protocol message type handling and validation
- Event emission for state, errors, and connection status
- Clean listener management with unsubscribe functions

#### React Integration (useRoom.ts)

```typescript
export function useRoom() {
  return { 
    state: RoomState, 
    svc: ServiceMethods,
    status?: ConnectionStatus,
    error?: string 
  };
}
```

**Implementation Details:**
- Module-level singleton for shared connection across components
- State synchronization with React hooks
- Optional status and error exposure for UI feedback
- Backward-compatible API with existing components

## Data Models

### Backend Data Models

#### Phase-Based State Model

```typescript
// Primary state (mutable)
interface RoomState {
  phase: 'Idle' | 'Lobby' | 'InGame';
  hostId: string | null;
  impostorId: string | null;
  word: string | null;
}

// Player tracking (mutable)
interface PlayerTracking {
  players: Map<string, 'Idle' | 'Lobby' | 'InGame'>;
  sockets: Map<string, WebSocket>;
}

// Derived properties (computed)
interface DerivedState {
  roomClaimed: boolean;    // phase !== 'Idle'
  gameStarted: boolean;    // phase === 'InGame'
  roomSize: number;        // count of active players
}
```

#### Message Flow Model

```typescript
// Inbound: Client → Server
type ClientMsg = 
  | { type: 'hello'; data: { sessionId?: string } }
  | { type: 'claimHost' | 'join' | 'startGame' | 'endGame' | 'leave' };

// Outbound: Server → Client  
type StateMsg = {
  type: 'state';
  data: {
    status: PlayerStatus;
    players: number;
    maxPlayers: number;
    gameStarted: boolean;
    you?: PlayerInfo;
  };
};

type ErrorMsg = {
  type: 'error';
  data: { message: string };
};
```

### Frontend Data Models

#### Connection State Model

```typescript
interface ConnectionState {
  status: 'connecting' | 'open' | 'closed' | 'reconnecting' | 'failed';
  error: string | null;
  reconnectAttempts: number;
  backoffDelay: number;
}
```

#### Session State Model

```typescript
interface SessionState {
  sessionId: string;
  devMode: boolean;
  storageKey: string; // 'uc:devSession' | 'uc:session'
}
```

## Error Handling

### Backend Error Handling

**Connection Errors:**
- WebSocket upgrade failures return HTTP 426
- Invalid JSON messages are silently ignored
- Socket close/error events trigger unified cleanup

**Business Logic Errors:**
- Invalid state transitions return structured error messages
- Capacity violations return "Room is full" error
- Permission violations return appropriate error messages

**Error Response Format:**
```typescript
{
  type: 'error',
  data: { message: string }
}
```

### Frontend Error Handling

**Transport Errors:**
- Connection failures trigger automatic reconnection
- JSON parse errors are silently ignored
- WebSocket errors are logged and trigger reconnection

**Protocol Errors:**
- Server error messages are propagated to UI layer
- Invalid message types are ignored
- State inconsistencies trigger re-synchronization

**Error Propagation:**
```typescript
// Error events flow: WS → RoomClient → useRoom → UI
ws.onError → client.emit('error') → hook.setError → UI display
```

## Testing Strategy

### Manual Testing Approach

Since automated tests will be created after the refactor, the testing strategy focuses on comprehensive manual verification:

**Core Functionality Tests:**
1. **Basic Flow**: Host claim → Join → Start game → End game
2. **Multi-tab Testing**: Multiple browser tabs with different sessions
3. **Dev Mode**: Toggle dev mode and verify session behavior
4. **Capacity Limits**: Test 8-player limit and error handling
5. **Leave Scenarios**: Test host leave, player leave, socket disconnect
6. **Reconnection**: Test network interruption and automatic reconnection

**State Consistency Tests:**
1. **Phase Transitions**: Verify all state transitions work correctly
2. **Derived Properties**: Ensure roomSize, roomClaimed, gameStarted are always consistent
3. **Player Tracking**: Verify player states align with room phase
4. **Socket Management**: Ensure socket cleanup on disconnect

**Error Handling Tests:**
1. **Invalid Commands**: Test commands in wrong states
2. **Network Issues**: Test connection failures and recovery
3. **Malformed Messages**: Test invalid JSON and message types
4. **Concurrent Actions**: Test simultaneous joins and state changes

### Acceptance Criteria Verification

Each requirement's acceptance criteria will be manually verified:

- **Requirement 1**: Verify single phase drives all state
- **Requirement 2**: Test unified leave/disconnect behavior  
- **Requirement 3**: Verify modular frontend architecture
- **Requirement 4**: Test dev/prod session management
- **Requirement 5**: Test WebSocket reconnection reliability
- **Requirement 6**: Verify UI components work unchanged
- **Requirement 7**: Test error handling and status reporting
- **Requirement 8**: Test capacity and concurrency management

### Post-Refactor Test Creation

After manual verification confirms the refactor works correctly:

1. **Unit Tests**: Create tests for individual modules (session, ws, roomClient)
2. **Integration Tests**: Test component interactions and state flows
3. **E2E Tests**: Test complete user workflows across multiple tabs
4. **Error Scenario Tests**: Automated tests for error conditions and edge cases

This approach ensures the refactor is thoroughly validated before committing to automated test creation, reducing the risk of testing incorrect implementations.
