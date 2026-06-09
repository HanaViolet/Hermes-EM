import { WebSocket, type WebSocketServer } from 'ws';
import type { SimulationEngine } from '../simulation/SimulationEngine.js';
import type { MarketState, SimulationCommand, SimulationStatus } from '../simulation/types.js';

type SimulationMessage =
  | { version: 1; type: 'simulation_state'; payload: MarketState }
  | { version: 1; type: 'simulation_status'; payload: SimulationStatus }
  | { version: 1; type: 'simulation_error'; payload: { message: string } };

function send(ws: WebSocket, message: SimulationMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(wss: WebSocketServer, message: SimulationMessage): void {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function parseCommand(raw: unknown): SimulationCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as { type?: unknown; payload?: unknown };
  if (message.type !== 'simulation_command') return null;
  if (!message.payload || typeof message.payload !== 'object') return null;
  const payload = message.payload as Partial<SimulationCommand>;
  if (!payload.command) return null;
  return payload as SimulationCommand;
}

export function attachSimulationSocket(wss: WebSocketServer, engine: SimulationEngine): void {
  wss.on('connection', (ws) => {
    send(ws, { version: 1, type: 'simulation_state', payload: engine.getState() });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as unknown;
        const command = parseCommand(parsed);
        if (!command) return;
        engine.handleCommand(command);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid simulation command';
        send(ws, { version: 1, type: 'simulation_error', payload: { message } });
      }
    });
  });

  engine.on('state', (payload: MarketState) => {
    broadcast(wss, { version: 1, type: 'simulation_state', payload });
  });

  engine.on('status', (payload: SimulationStatus) => {
    broadcast(wss, { version: 1, type: 'simulation_status', payload });
  });
}
