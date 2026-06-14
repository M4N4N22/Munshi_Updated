import { Injectable } from '@nestjs/common';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import {
  InventoryCandidate,
  ResolvedTaskInventoryIntent,
  WorkerCandidate,
} from './task-inventory-resolution.interfaces';
import {
  formatTaskKindLabel,
  taskKindRequiresInventory,
} from './task-inventory-nl.helper';
import type { TaskInventoryStockAvailability } from './task-inventory-stock-availability.service';
import { formatQuantity } from 'src/services/inventory/inventory.validation';

@Injectable()
export class TaskInventoryConfirmationService {
  buildConfirmationMessage(
    resolved: ResolvedTaskInventoryIntent,
    stock?: TaskInventoryStockAvailability | null,
  ): string {
    const lines: string[] = ['I found:', ''];

    lines.push(`*Task Type:*\n${formatTaskKindLabel(resolved.task_kind)}`, '');

    if (resolved.worker.status === 'resolved' && resolved.worker.name) {
      lines.push(`*Worker:*\n${resolved.worker.name}`, '');
    } else {
      lines.push('*Worker:*\n—', '');
    }

    if (taskKindRequiresInventory(resolved.task_kind)) {
      if (resolved.inventory.status === 'resolved' && resolved.inventory.name) {
        const sku = resolved.inventory.sku ? ` (${resolved.inventory.sku})` : '';
        lines.push(`*Inventory:*\n${resolved.inventory.name}${sku}`, '');
      } else {
        lines.push('*Inventory:*\n—', '');
      }

      if (stock) {
        const unit = stock.unit.trim() || 'unit';
        lines.push(
          `*Stock available:*\n${formatQuantity(stock.available)} ${unit}`,
          '',
        );
      }

      lines.push(
        `*Quantity:*\n${resolved.quantity != null ? resolved.quantity : '—'}`,
        '',
      );
    }

    lines.push(
      'Reply:',
      '',
      '1. *CONFIRM*',
      '2. *CANCEL*',
    );

    return waSection('Confirm task', lines.join('\n'));
  }

  buildInventoryDisambiguationPrompt(candidates: InventoryCandidate[]): string {
    const list = candidates
      .map((c, i) => `${i + 1}. ${c.name}`)
      .join('\n');
    return waSection(
      'Multiple inventory items',
      `I found multiple inventory items:\n\n${list}\n\nReply with a number.`,
    );
  }

  buildWorkerDisambiguationPrompt(candidates: WorkerCandidate[]): string {
    const list = candidates
      .map((c, i) => `${i + 1}. ${c.name}`)
      .join('\n');
    return waSection(
      'Multiple workers',
      `I found multiple workers:\n\n${list}\n\nReply with a number.`,
    );
  }

  buildUnresolvedInventoryMessage(hint: string | null): string {
    return waSection(
      'Inventory not found',
      `Could not find inventory matching *${hint ?? 'your request'}*.\n\n` +
        'Please check the item name or SKU and try again.',
    );
  }

  buildUnresolvedWorkerMessage(hint: string | null): string {
    return waSection(
      'Worker not found',
      `Could not find worker matching *${hint ?? 'your request'}*.\n\n` +
        'Please use the worker name from your team list.',
    );
  }

  buildIncompleteDeliveryMessage(taskKind: string | null): string {
    const action = taskKind === 'issue' ? 'issue' : 'delivery';
    return waSection(
      'Thoda aur detail chahiye',
      `*${action === 'issue' ? 'Issue' : 'Delivery'}* ke liye ye batayein:\n\n` +
        '• *Kaun karega* — team member ka naam\n' +
        '• *Kya* — item name ya SKU\n' +
        '• *Kitni quantity* (optional — baad mein puchenge)\n\n' +
        'Example:\n' +
        '*vikram ko 5 test item 1 bhejo*\n' +
        'ya *vikram test item 1 jana hai aaj*',
    );
  }

  buildInvalidSelectionMessage(max: number): string {
    return waSection(
      'Invalid selection',
      `Please reply with a number between *1* and *${max}*, or send *CANCEL*.`,
    );
  }

  buildRepromptConfirmation(): string {
    return waSection(
      'Please confirm',
      'Reply *CONFIRM* (or *YES* / *1*) to create the task.\n' +
        'Reply *CANCEL* (or *NO* / *2*) to abort.',
    );
  }

  buildQuantityPrompt(params: {
    workerName?: string | null;
    itemName?: string | null;
    stock?: TaskInventoryStockAvailability | null;
    stockLabel?: string | null;
  }): string {
    const bits: string[] = [];
    if (params.workerName) {
      bits.push(`*${params.workerName}* ko`);
    }
    if (params.itemName) {
      bits.push(`*${params.itemName}*`);
    }
    const summary = bits.length ? bits.join(' ') + ' ke liye' : 'Is task ke liye';

    const stockLine = params.stockLabel
      ? `\n\n${params.stockLabel}\n`
      : params.stock
        ? `\n\n📦 Stock abhi: *${formatQuantity(params.stock.available)}* ${params.stock.unit || 'unit'} available\n`
        : '\n';

    const maxHint =
      params.stock && params.stock.available > 0
        ? `\nMaximum *${formatQuantity(params.stock.available)}* tak bhej sakte hain.`
        : params.stock && params.stock.available <= 0
          ? '\n⚠️ Abhi stock available nahi hai — pehle stock update karein.'
          : '';

    return waSection(
      'Quantity chahiye',
      `${summary} kitni quantity bhejni hai?${stockLine}` +
        'Number likhein — jaise *1*, *5*, ya *20*.' +
        maxHint +
        '\nCancel ke liye *CANCEL* likhein.',
    );
  }

  buildQuantityExceedsStockMessage(params: {
    requested: number;
    stock: TaskInventoryStockAvailability;
    stockLabel: string;
  }): string {
    const unit = params.stock.unit.trim() || 'unit';
    return waSection(
      'Stock se zyada',
      `Aapne *${formatQuantity(params.requested)}* ${unit} likha — ` +
        `available sirf *${formatQuantity(params.stock.available)}* ${unit} hai.\n\n` +
        `${params.stockLabel}\n\n` +
        'Kam quantity likhein ya pehle stock badhayein.\n' +
        'Cancel ke liye *CANCEL* likhein.',
    );
  }

  buildInvalidQuantityMessage(): string {
    return waSection(
      'Invalid quantity',
      'Sahi positive number likhein — jaise *1* ya *10*.\n' +
        'Cancel ke liye *CANCEL* likhein.',
    );
  }

  buildTaskCreatedMessage(params: {
    taskId: number;
    workerName: string;
    itemName?: string;
    quantity?: string;
    taskKind: string | null;
  }): string {
    const lines = [
      'Task created successfully.',
      '',
      `*Task ID:* T-${params.taskId}`,
      '',
      '*Assigned to:*',
      params.workerName,
    ];

    if (params.itemName) {
      lines.push('', '*Inventory:*', params.itemName);
    }
    if (params.quantity) {
      lines.push('', '*Quantity:*', params.quantity);
    }

    return waSection('Task created', lines.join('\n'));
  }

  buildAlreadyCreatedMessage(taskId: number): string {
    return waSection(
      'Task already created',
      `This workflow already created *Task T-${taskId}*.\n\n` +
        'Send a new message to create another task.',
    );
  }

  buildRecoveryMessage(title: string, detail: string): string {
    return waSection(title, detail);
  }
}
