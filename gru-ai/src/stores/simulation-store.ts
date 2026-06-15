import { create } from 'zustand';
import type { MarketState, SimulationCommand, SimulationStatus } from '@/types/market';

type CommandSender = (command: SimulationCommand) => void;

interface SimulationStore {
  connected: boolean;
  marketState: MarketState | null;
  status: SimulationStatus | null;
  error: string | null;
  setConnected: (connected: boolean) => void;
  setMarketState: (state: MarketState) => void;
  setStatus: (status: SimulationStatus) => void;
  setError: (error: string | null) => void;
  setCommandSender: (sender: CommandSender | null) => void;
  sendCommand: (command: SimulationCommand) => void;
}

let commandSender: CommandSender | null = null;

export const useSimulationStore = create<SimulationStore>((set) => ({
  connected: false,
  marketState: null,
  status: null,
  error: null,
  setConnected: (connected) => set({ connected }),
  setMarketState: (marketState) => set({ marketState, status: marketState.status, error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setCommandSender: (sender) => {
    commandSender = sender;
  },
  sendCommand: (command) => {
    if (!commandSender) {
      set({ error: 'Simulation socket is not connected' });
      return;
    }
    set({ error: null });
    commandSender(command);
  },
}));
