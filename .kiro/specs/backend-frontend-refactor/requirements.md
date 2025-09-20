# Requirements Document

## Introduction

This refactor aims to simplify the Undercover Word Game's architecture by implementing a single-phase state machine in the backend and creating a cleaner, more modular frontend services layer. The refactor will improve maintainability, reduce state inconsistencies, and provide better separation of concerns while preserving all existing functionality and user experience.

## Requirements

### Requirement 1: Backend State Machine Simplification

**User Story:** As a developer, I want a single authoritative phase-based state machine in the backend, so that state management is simplified and inconsistencies are eliminated.

#### Acceptance Criteria

1. WHEN the backend manages room state THEN it SHALL use a single `Phase` enum with values 'Idle' | 'Lobby' | 'InGame'
2. WHEN derived properties are needed THEN the system SHALL compute `roomClaimed`, `gameStarted`, and `roomSize` from the authoritative phase and player states using private getters
3. WHEN state transitions occur THEN the system SHALL ensure all derived properties remain consistent with the phase automatically
4. WHEN multiple boolean flags were previously used THEN they SHALL be completely replaced with computed getters that cannot be manually mutated
5. WHEN the room is in 'Idle' phase THEN `roomClaimed` SHALL be false and `roomSize` SHALL count only active socket connections
6. WHEN the room is in 'Lobby' or 'InGame' phase THEN `roomClaimed` SHALL be true
7. WHEN the room is in 'InGame' phase THEN `gameStarted` SHALL be true
8. WHEN the room is not in 'InGame' phase THEN `gameStarted` SHALL be false
9. WHEN calculating `roomSize` THEN it SHALL only count players with status !== 'Idle' AND who have active socket connections

### Requirement 2: Unified Leave and Socket Close Handling

**User Story:** As a developer, I want consistent behavior for both explicit leave actions and socket disconnections, so that room state remains predictable regardless of how a player exits.

#### Acceptance Criteria

1. WHEN a player explicitly leaves OR their socket closes THEN the system SHALL handle both scenarios through a unified `leaveOrClose` function
2. WHEN the host leaves during any phase THEN the room SHALL reset to 'Idle' phase for all players
3. WHEN any player leaves during 'InGame' phase THEN the room SHALL reset to 'Idle' phase for all players
4. WHEN a non-host player leaves during 'Lobby' phase THEN only that player SHALL be marked as 'Idle' and room size decremented
5. WHEN the lobby becomes empty after a player leaves THEN the room SHALL reset to 'Idle' phase
6. WHEN a socket closes unexpectedly THEN the system SHALL remove the socket from the sockets map and call the same leave logic
7. WHEN a player reconnects after a disconnect THEN they SHALL be treated as a new connection requiring a fresh hello message

### Requirement 3: Frontend Services Layer Separation

**User Story:** As a developer, I want clearly separated concerns in the frontend services, so that session management, transport, and domain logic are independently maintainable.

#### Acceptance Criteria

1. WHEN managing session identity THEN the system SHALL use a dedicated `session.ts` module
2. WHEN handling WebSocket transport THEN the system SHALL use a dedicated `ws.ts` module with reconnection logic
3. WHEN managing room protocol and domain logic THEN the system SHALL use a dedicated `roomClient.ts` module
4. WHEN React components need room functionality THEN they SHALL use a `useRoom.ts` hook that orchestrates the other services
5. WHEN services are separated THEN each module SHALL have a single, well-defined responsibility
6. WHEN the existing `RoomService.ts` and `types.ts` files exist THEN they SHALL be removed and replaced with the new modular structure

### Requirement 4: Session Management Consistency

**User Story:** As a developer and user, I want consistent session behavior across development and production modes, so that testing and user experience are predictable.

#### Acceptance Criteria

1. WHEN dev mode is enabled THEN each browser tab SHALL get a unique session ID that persists across refreshes within that tab
2. WHEN dev mode is disabled THEN all browser tabs SHALL share the same persistent session ID across browser sessions
3. WHEN dev mode setting changes THEN the session management behavior SHALL update accordingly
4. WHEN session IDs are generated THEN they SHALL be cryptographically unique
5. WHEN in dev mode THEN session IDs SHALL include a "dev_" prefix for easy identification

### Requirement 5: WebSocket Transport Reliability

**User Story:** As a user, I want reliable WebSocket connections with automatic reconnection, so that temporary network issues don't disrupt my game experience.

#### Acceptance Criteria

1. WHEN the WebSocket connection is lost THEN the system SHALL automatically attempt to reconnect
2. WHEN reconnecting THEN the system SHALL use exponential backoff starting at 250ms up to 4 seconds maximum
3. WHEN the connection is restored THEN the system SHALL automatically send a hello message with the session ID
4. WHEN connection status changes THEN the system SHALL notify listeners of the new status
5. WHEN multiple reconnection attempts fail THEN the system SHALL continue trying until explicitly stopped
6. WHEN the connection is manually closed THEN automatic reconnection SHALL be disabled

### Requirement 6: API Compatibility Preservation

**User Story:** As a developer, I want the existing UI components to work without changes, so that the refactor doesn't break the user interface.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN `useRoom()` hook SHALL return at minimum the same `{ state, svc }` interface with optional additional fields
2. WHEN UI components call service methods THEN all existing methods (`claimHost`, `join`, `startGame`, `endGame`, `leave`) SHALL remain available with identical signatures
3. WHEN state updates occur THEN the state object structure SHALL remain identical to the current format for all existing fields
4. WHEN the shared protocol types are used THEN `packages/shared/src/protocol.ts` SHALL remain completely unchanged
5. WHEN App.tsx and screen components are used THEN they SHALL require no modifications to function correctly
6. WHEN CI workflows and deployment configurations exist THEN they SHALL remain unchanged

### Requirement 7: Error Handling and Status Reporting

**User Story:** As a user, I want clear feedback about connection status and errors, so that I understand what's happening with my game session.

#### Acceptance Criteria

1. WHEN connection status changes THEN the system SHALL provide status updates ('connecting', 'open', 'closed', 'reconnecting', 'failed')
2. WHEN server errors occur THEN they SHALL be properly propagated to the UI layer
3. WHEN the useRoom hook is used THEN it SHALL optionally expose connection status and error information
4. WHEN WebSocket errors occur THEN they SHALL be handled gracefully without crashing the application
5. WHEN JSON parsing fails THEN errors SHALL be silently ignored to prevent crashes

### Requirement 8: Capacity and Concurrency Management

**User Story:** As a user, I want room capacity limits to be enforced correctly, so that games don't become overcrowded and the experience remains fair.

#### Acceptance Criteria

1. WHEN the room reaches maximum capacity (8 players) THEN additional join attempts SHALL receive an error message "Room is full"
2. WHEN simultaneous join requests occur THEN the Durable Object's single-threaded nature SHALL prevent race conditions
3. WHEN capacity is checked THEN only active players with open socket connections SHALL be counted
4. WHEN players disconnect THEN their slot SHALL become immediately available for new players
5. WHEN the room size is calculated THEN it SHALL only count non-Idle players with active connections

### Requirement 9: Testing and Manual Verification

**User Story:** As a developer, I want to ensure the refactor works correctly through manual testing, so that all functionality is preserved and improved.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN manual testing SHALL verify all acceptance criteria are met
2. WHEN `npm run dev` is executed THEN both backend and frontend SHALL launch successfully
3. WHEN dev mode is toggled THEN session behavior SHALL change as specified in Requirement 4
4. WHEN multiple browser tabs are used THEN the host/join/game flow SHALL work correctly across tabs
5. WHEN network interruptions occur THEN reconnection SHALL work as specified in Requirement 5
6. WHEN room capacity limits are tested THEN error handling SHALL work as specified in Requirement 8
7. WHEN automated tests are created THEN they SHALL be implemented after the refactor is complete, not during
8. WHEN the refactor implementation occurs THEN no test files SHALL be created or modified during the refactor process
