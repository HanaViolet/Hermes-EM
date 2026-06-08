import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string): string {
  if (!date) return 'never';

  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 0) return 'just now';
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function sessionStatusLabel(status: string): string {
  switch (status) {
    case 'working':
      return 'Working';
    case 'waiting-approval':
      return 'Waiting Approval';
    case 'waiting-input':
      return 'Waiting Input';
    case 'done':
      return 'Done';
    case 'paused':
      return 'Paused';
    case 'idle':
      return 'Idle';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}
