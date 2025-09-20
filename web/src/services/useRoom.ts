import { useState, useEffect, useRef } from 'react';
import { RoomClient, type RoomState, type RoomEvent } from './roomClient.js';
import type { ConnectionStatus } from './ws.js';

// Service methods interface matching existing API
export interface ServiceMethods {
  connect: () => void;
  claimHost: () => void;
  join: () => void;
  startGame: () => void;
  endGame: () => void;
  leave: () => void;
}

// Hook return type - maintains backward compatibility with optional new fields
export interface UseRoomReturn {
  state: RoomState;
  svc: ServiceMethods;
  status?: ConnectionStatus;
  error?: string;
}

// Module-level singleton for shared connection across components
let sharedClient: RoomClient | null = null;
let connectionListeners: Array<(event: RoomEvent) => void> = [];

// Initialize shared client
function getSharedClient(): RoomClient {
  if (!sharedClient) {
    const env: any = import.meta.env;

    // Prefer explicit VITE_WS_URL if provided
    const wsUrl = env?.VITE_WS_URL
      ? String(env.VITE_WS_URL)
      : env?.DEV
        ? 'ws://localhost:8787/ws'
        : `wss://${window.location.host}/ws`;

    sharedClient = new RoomClient(wsUrl);

    // Set up shared event handling
    sharedClient.on((event) => {
      connectionListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in connection listener:', error);
        }
      });
    });

    // Auto-connect the shared client
    sharedClient.connect();
  }

  return sharedClient;
}

/**
 * React hook for room functionality with module-singleton pattern
 * Maintains backward compatibility with { state, svc } interface
 * Optionally exposes status and error for enhanced UI feedback
 */
export function useRoom(): UseRoomReturn {
  const client = getSharedClient();

  // React state for component updates
  const [state, setState] = useState<RoomState>(() => client.getState());
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Event handler for room events
    const handleRoomEvent = (event: RoomEvent) => {
      if (!isMountedRef.current) return;

      switch (event.type) {
        case 'state':
          setState(event.data);
          setError(null);
          break;
        case 'error':
          setError(event.message);
          break;
        case 'status':
          setStatus(event.status);
          if (event.status === 'open') {
            setError(null);
          }
          break;
      }
    };

    // Add listener to shared array
    connectionListeners.push(handleRoomEvent);

    // Initialize with current state
    setState(client.getState());

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      const index = connectionListeners.indexOf(handleRoomEvent);
      if (index > -1) {
        connectionListeners.splice(index, 1);
      }
    };
  }, [client]);

  // Service methods object - maintains existing API
  const svc: ServiceMethods = {
    connect: () => client.connect(),
    claimHost: () => client.claimHost(),
    join: () => client.join(),
    startGame: () => client.startGame(),
    endGame: () => client.endGame(),
    leave: () => client.leave()
  };

  return {
    state,
    svc,
    status,
    error: error || undefined
  };
}
