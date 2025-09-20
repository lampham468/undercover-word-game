# Implementation Plan

- [x] 1. Backend State Machine Refactor
  - Replace multi-flag state management with single Phase enum in backend/src/worker.ts
  - Implement derived property getters for roomClaimed, gameStarted, roomSize
  - Create unified leaveOrClose function for consistent disconnect handling
  - _Requirements: 1.1, 1.2, 1.4, 1.9, 2.1, 2.6_

- [x] 2. Frontend Services Cleanup
  - Delete existing web/src/services/RoomService.ts and web/src/services/types.ts files
  - Remove any remaining imports that reference the deleted service files
  - _Requirements: 3.6_

- [x] 3. Create Session Management Module
  - Create web/src/services/session.ts with dev/prod mode session handling
  - Implement isDevMode(), setDevMode(), and getSessionId() functions
  - Add dev mode session storage with "dev_" prefix and prod mode localStorage persistence
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 4. Create WebSocket Transport Module
  - Create web/src/services/ws.ts with WebSocket lifecycle management
  - Implement WS class with connect(), send(), close() methods
  - Add exponential backoff reconnection logic (250ms to 4s max)
  - Implement status tracking and listener management for connection events
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

- [x] 5. Create Room Protocol Client Module
  - Create web/src/services/roomClient.ts with room domain logic
  - Implement RoomClient class with protocol command methods (claimHost, join, etc.)
  - Add message handling for state updates and error propagation
  - Integrate session management and WebSocket transport
  - _Requirements: 3.3, 7.2, 7.4_

- [x] 6. Update React Integration Hook
  - Replace entire contents of web/src/services/useRoom.ts with new implementation
  - Implement module-singleton pattern for shared connection across components
  - Add optional status and error fields while maintaining backward compatibility
  - Ensure existing { state, svc } interface is preserved
  - _Requirements: 3.4, 6.1, 6.2, 7.3_

- [x] 7. Verify API Compatibility
  - Ensure all existing service methods (claimHost, join, startGame, endGame, leave) work identically
  - Verify state object structure matches existing format for all current fields
  - Confirm App.tsx and screen components work without modifications
  - Test that packages/shared/src/protocol.ts remains unchanged
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Manual Testing and Validation
  - Test npm run dev launches both apps successfully
  - Verify dev mode toggle changes session behavior correctly
  - Test multi-tab host/join/game flow across browser tabs
  - Validate WebSocket reconnection works during network interruptions
  - Test room capacity limits and error handling at 8 players
  - Verify all acceptance criteria from requirements are met
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
