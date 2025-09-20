export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'reconnecting' | 'failed';

export type MessageListener = (data: unknown) => void;
export type StatusListener = (status: ConnectionStatus) => void;

export class WS {
  private ws: WebSocket | null = null;
  private url: string;
  private status: ConnectionStatus = 'closed';
  private messageListeners: MessageListener[] = [];
  private statusListeners: StatusListener[] = [];
  private reconnectAttempts = 0;
  private baseDelay = 250; // 250ms base delay
  private maxDelay = 4000; // 4s max delay
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;
  private onConnectedCallback: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.shouldReconnect = true;
    this.setStatus('connecting');
    
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionError();
    }
  }

  send(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(obj));
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  close(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.setStatus('closed');
  }

  onMessage(fn: MessageListener): () => void {
    this.messageListeners.push(fn);
    return () => {
      const index = this.messageListeners.indexOf(fn);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.push(fn);
    // Immediately call with current status
    fn(this.status);
    return () => {
      const index = this.statusListeners.indexOf(fn);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  // Allow setting a callback for when connection is established/restored
  onConnected(fn: () => void): void {
    this.onConnectedCallback = fn;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setStatus('open');
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      
      // Call the connected callback (for sending hello message)
      if (this.onConnectedCallback) {
        this.onConnectedCallback();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error('Error in message listener:', error);
          }
        });
      } catch (error) {
        // Silently ignore JSON parse errors as per requirements
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.shouldReconnect) {
        this.handleConnectionError();
      } else {
        this.setStatus('closed');
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionError();
    };
  }

  private handleConnectionError(): void {
    if (!this.shouldReconnect) {
      this.setStatus('failed');
      return;
    }

    this.reconnectAttempts++;
    
    if (this.reconnectAttempts === 1) {
      this.setStatus('reconnecting');
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxDelay
    );

    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in status listener:', error);
        }
      });
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Getter for current status
  getStatus(): ConnectionStatus {
    return this.status;
  }
}
