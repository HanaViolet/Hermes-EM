import { useEffect, useRef } from 'react';
import { WS_URL } from '@/lib/api';
import { useMarketStore } from '@/stores/marketStore';
import { useNewsStore } from '@/stores/newsStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useSimulationStore } from '@/stores/simulation-store';
import { useTrainingStore } from '@/stores/trainingStore';
import type { SimulationCommand, SimulationMessage } from '@/types/market';

const MAX_RECONNECT_DELAY = 30000;

export function useSimulationWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setConnected = useSimulationStore((s) => s.setConnected);
  const setSimulationMarketState = useSimulationStore((s) => s.setMarketState);
  const setStatus = useSimulationStore((s) => s.setStatus);
  const setError = useSimulationStore((s) => s.setError);
  const setCommandSender = useSimulationStore((s) => s.setCommandSender);
  const setMarketState = useMarketStore((s) => s.setMarketState);
  const setStockList = useMarketStore((s) => s.setStockList);
  const mergeMarketUpdate = useMarketStore((s) => s.mergeMarketUpdate);
  const mergeAgentUpdate = useMarketStore((s) => s.mergeAgentUpdate);
  const setNewsUpdate = useNewsStore((s) => s.setNewsUpdate);
  const setScenarioUpdate = useScenarioStore((s) => s.setScenarioUpdate);
  const setTrainingUpdate = useTrainingStore((s) => s.setTrainingUpdate);

  useEffect(() => {
    function sendCommand(command: SimulationCommand) {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        setError('Simulation socket is not connected');
        return;
      }
      ws.send(JSON.stringify({ version: 1, type: 'simulation_command', payload: command }));
    }

    function scheduleReconnect() {
      if (reconnectTimerRef.current) return;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY);
        connect();
      }, reconnectDelayRef.current);
    }

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelayRef.current = 1000;
        setConnected(true);
        setError(null);
        setCommandSender(sendCommand);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SimulationMessage | { version?: unknown; type?: unknown };
          if (message.version !== 1) return;
          switch (message.type) {
            case 'simulation_state':
              setSimulationMarketState(message.payload);
              setMarketState(message.payload);
              break;
            case 'simulation_status':
              setStatus(message.payload);
              break;
            case 'simulation_error':
              setError(message.payload.message);
              break;
            case 'market_update':
              mergeMarketUpdate(message.payload);
              break;
            case 'agent_update':
              mergeAgentUpdate(message.payload);
              break;
            case 'scenario_update':
              setScenarioUpdate(message.payload);
              break;
            case 'training_update':
              setTrainingUpdate(message.payload);
              break;
            case 'news_update':
              setNewsUpdate(message.payload);
              break;
            case 'stock_list':
              setStockList(message.payload);
              break;
          }
        } catch {
          setError('Received malformed simulation message');
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setCommandSender(null);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setCommandSender(null);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [setConnected, setSimulationMarketState, setStatus, setError, setCommandSender, setMarketState, setStockList, mergeMarketUpdate, mergeAgentUpdate, setNewsUpdate, setScenarioUpdate, setTrainingUpdate]);
}
