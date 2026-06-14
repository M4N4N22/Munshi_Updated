import {
  TASK_INVENTORY_CANCEL_REPLIES,
  TASK_INVENTORY_CONFIRM_REPLIES,
} from './task-inventory-nl.constants';

export function normalizeReplyInput(message: string): string {
  return message.trim().toLowerCase();
}

export function isConfirmReply(message: string): boolean {
  const input = normalizeReplyInput(message);
  return TASK_INVENTORY_CONFIRM_REPLIES.includes(input);
}

export function isCancelReply(message: string): boolean {
  const input = normalizeReplyInput(message);
  return TASK_INVENTORY_CANCEL_REPLIES.includes(input);
}

export function parseSelectionIndex(message: string, max: number): number | null {
  const trimmed = message.trim();
  const match = trimmed.match(/^(\d{1,2})$/);
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isFinite(index) || index < 1 || index > max) return null;
  return index;
}

export function parseQuantityReply(message: string): number | null {
  const trimmed = message.trim().replace(/,/g, '');
  const match = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function taskKindRequiresInventory(taskKind: string | null): boolean {
  return taskKind === 'delivery' || taskKind === 'issue';
}

export function taskKindRequiresWorker(_taskKind: string | null): boolean {
  return true;
}

export function formatTaskKindLabel(taskKind: string | null): string {
  switch (taskKind) {
    case 'delivery':
      return 'Delivery';
    case 'issue':
      return 'Issue';
    case 'inventory_count':
      return 'Inventory count';
    default:
      return 'Task';
  }
}
