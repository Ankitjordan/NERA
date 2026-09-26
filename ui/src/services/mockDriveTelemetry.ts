import type { MockDriveState } from './mockDriveEngine';

export class MockDriveTelemetry {
  private socket: WebSocket | null = null;
  private pendingState: MockDriveState | null = null;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;

    const configuredUrl = import.meta.env.VITE_ROUTING_ENGINE_WS_URL;
    const url = configuredUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8080/ws/mock-drive`;
    this.socket = new WebSocket(url);
    this.socket.addEventListener('open', () => {
      if (this.pendingState) {
        this.socket?.send(JSON.stringify(this.pendingState));
        this.pendingState = null;
      }
    });
    this.socket.addEventListener('error', () => {
      console.warn('Mock drive telemetry websocket is unavailable');
    });
  }

  send(state: MockDriveState): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(state));
    } else {
      this.pendingState = state;
    }
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
    this.pendingState = null;
  }
}