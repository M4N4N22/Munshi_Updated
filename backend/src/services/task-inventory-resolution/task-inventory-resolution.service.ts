import { Injectable } from '@nestjs/common';
import { TaskInventoryExtractionContract } from '../../../contracts/typescript/index';
import { collectDisambiguationPayloads } from './disambiguation.util';
import { InventoryResolverService } from './inventory-resolver.service';
import { ResolvedTaskInventoryIntent } from './task-inventory-resolution.interfaces';
import { WorkerResolverService } from './worker-resolver.service';

@Injectable()
export class TaskInventoryResolutionService {
  constructor(
    private readonly inventoryResolver: InventoryResolverService,
    private readonly workerResolver: WorkerResolverService,
  ) {}

  async resolveIntent(
    factoryId: number,
    extraction: TaskInventoryExtractionContract,
  ): Promise<ResolvedTaskInventoryIntent> {
    const [inventory, worker] = await Promise.all([
      this.inventoryResolver.resolve(factoryId, extraction.item_name_or_sku),
      this.workerResolver.resolve(factoryId, extraction.assignee_hint),
    ]);

    let quantity = extraction.quantity;
    if (
      quantity == null &&
      (extraction.task_kind === 'delivery' || extraction.task_kind === 'issue') &&
      inventory.status === 'resolved' &&
      worker.status === 'resolved'
    ) {
      quantity = 1;
    }

    return {
      task_kind: extraction.task_kind,
      quantity,
      inventory,
      worker,
      disambiguation: collectDisambiguationPayloads(inventory, worker),
    };
  }
}
