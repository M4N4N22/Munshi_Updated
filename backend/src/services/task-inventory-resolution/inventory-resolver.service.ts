import { Injectable } from '@nestjs/common';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import {
  InventoryCandidate,
  InventoryItemSummary,
  InventoryMatchResult,
} from './task-inventory-resolution.interfaces';
import {
  RESOLVER_FUZZY_MIN_GAP,
  RESOLVER_FUZZY_THRESHOLD,
  RESOLVER_MAX_CANDIDATES,
} from './task-inventory-resolution.constants';
import { bestFuzzyMatches, similarityRatio } from './fuzzy-match.util';

@Injectable()
export class InventoryResolverService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async resolve(
    factoryId: number,
    hint: string | null | undefined,
  ): Promise<InventoryMatchResult> {
    const normalized = hint?.trim();
    if (!normalized) {
      return { status: 'not_found' };
    }

    const exactSku = await this.inventoryRepository.findItemBySku(
      factoryId,
      normalized,
    );
    if (exactSku) {
      return this.toResolved(exactSku, 'exact_sku');
    }

    const caseInsensitiveSku =
      await this.inventoryRepository.findItemBySkuIgnoreCase(
        factoryId,
        normalized,
      );
    if (caseInsensitiveSku) {
      return this.toResolved(caseInsensitiveSku, 'case_insensitive');
    }

    const exactName = await this.inventoryRepository.findItemByName(
      factoryId,
      normalized,
    );
    if (exactName) {
      return this.toResolved(exactName, 'exact_name');
    }

    const items = await this.loadSummaries(factoryId);
    const lowerHint = normalized.toLowerCase();

    const partialMatches = items.filter((item) => {
      const name = item.name.toLowerCase();
      const sku = item.sku.toLowerCase();
      return name.includes(lowerHint) || sku.includes(lowerHint);
    });

    if (partialMatches.length === 1) {
      return this.toResolved(partialMatches[0], 'partial');
    }
    if (partialMatches.length > 1) {
      return {
        status: 'ambiguous',
        candidates: partialMatches
          .slice(0, RESOLVER_MAX_CANDIDATES)
          .map((item) => this.toCandidate(item, 'partial')),
      };
    }

    const fuzzyHits = bestFuzzyMatches(
      normalized,
      items,
      (item) => item.name,
      RESOLVER_FUZZY_THRESHOLD,
      RESOLVER_MAX_CANDIDATES,
    );

    const skuFuzzyHits = bestFuzzyMatches(
      normalized,
      items,
      (item) => item.sku,
      RESOLVER_FUZZY_THRESHOLD,
      RESOLVER_MAX_CANDIDATES,
    );

    const merged = this.mergeFuzzyHits(fuzzyHits, skuFuzzyHits);
    if (merged.length === 0) {
      return { status: 'not_found' };
    }

    if (merged.length === 1) {
      return this.toResolved(merged[0].item, 'fuzzy');
    }

    const top = merged[0];
    const second = merged[1];
    if (
      top.score - second.score >= RESOLVER_FUZZY_MIN_GAP &&
      top.score >= RESOLVER_FUZZY_THRESHOLD
    ) {
      return this.toResolved(top.item, 'fuzzy');
    }

    return {
      status: 'ambiguous',
      candidates: merged.map(({ item, score }) =>
        this.toCandidate(item, 'fuzzy', score),
      ),
    };
  }

  private async loadSummaries(factoryId: number): Promise<InventoryItemSummary[]> {
    const rows = await this.inventoryRepository.findActiveItemSummaries(factoryId);
    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
    }));
  }

  private mergeFuzzyHits(
    nameHits: Array<{ item: InventoryItemSummary; score: number }>,
    skuHits: Array<{ item: InventoryItemSummary; score: number }>,
  ) {
    const byId = new Map<number, { item: InventoryItemSummary; score: number }>();
    for (const hit of [...nameHits, ...skuHits]) {
      const existing = byId.get(hit.item.id);
      if (!existing || hit.score > existing.score) {
        byId.set(hit.item.id, hit);
      }
    }
    return [...byId.values()].sort((a, b) => b.score - a.score);
  }

  private toResolved(
    item: { id: number; sku: string; name: string },
    match_type: InventoryMatchResult['match_type'],
  ): InventoryMatchResult {
    return {
      status: 'resolved',
      item_id: item.id,
      sku: item.sku,
      name: item.name,
      match_type,
    };
  }

  private toCandidate(
    item: InventoryItemSummary,
    match_type: InventoryCandidate['match_type'],
    score?: number,
  ): InventoryCandidate {
    return {
      item_id: item.id,
      sku: item.sku,
      name: item.name,
      match_type,
      ...(score != null ? { score: Number(score.toFixed(4)) } : {}),
    };
  }
}

/** Exported for unit tests. */
export function scoreInventoryNameHint(hint: string, name: string): number {
  return similarityRatio(hint, name);
}
