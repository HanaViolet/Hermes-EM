import { EventEmitter } from 'node:events';
import type { SimulationStatus, TickContext, TradingPhase } from './types.js';

const BASE_INTERVAL_MS = 800;
const OPEN_MINUTES = 9 * 60 + 30;

function virtualTimeForTick(tick: number): string {
  const elapsedMinutes = Math.floor(tick / 4);
  const total = OPEN_MINUTES + elapsedMinutes;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  const second = (tick % 4) * 15;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function phaseForTick(tick: number): TradingPhase {
  if (tick < 4) return 'call_auction';
  return 'continuous';
}

export class SimulationClock extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private speed = 1;
  private running = false;
  private startedAt: string | undefined;
  private pausedAt: string | undefined;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = this.startedAt ?? new Date().toISOString();
    this.pausedAt = undefined;
    this.schedule();
    this.emit('status', this.getStatus());
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.pausedAt = new Date().toISOString();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.emit('status', this.getStatus());
  }

  reset(): void {
    this.pause();
    this.tick = 0;
    this.startedAt = undefined;
    this.pausedAt = undefined;
    this.emit('status', this.getStatus());
  }

  step(): TickContext {
    this.tick += 1;
    const context = this.getTickContext();
    this.emit('tick', context);
    this.emit('status', this.getStatus());
    return context;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(16, speed));
    if (this.running) this.schedule();
    this.emit('status', this.getStatus());
  }

  getStatus(): SimulationStatus {
    return {
      running: this.running,
      phase: phaseForTick(this.tick),
      tick: this.tick,
      speed: this.speed,
      virtualTime: virtualTimeForTick(this.tick),
      startedAt: this.startedAt,
      pausedAt: this.pausedAt,
    };
  }

  getTickContext(): TickContext {
    return {
      tick: this.tick,
      virtualTime: virtualTimeForTick(this.tick),
      phase: phaseForTick(this.tick),
    };
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.removeAllListeners();
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer);
    const interval = Math.max(50, BASE_INTERVAL_MS / this.speed);
    this.timer = setInterval(() => this.step(), interval);
  }
}
