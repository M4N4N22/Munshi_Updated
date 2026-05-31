import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRepository } from './documents.repository';
import { SUGGESTION_STATUS } from './documents.constants';

export interface SuggestionQueueState {
  suggestion_ids: number[];
  current_index: number;
  completed: boolean;
}

@Injectable()
export class SuggestionQueueService {
  constructor(private readonly repository: DocumentRepository) {}

  async initializeQueue(
    documentId: number,
    factoryId: number,
    suggestionIds: number[],
  ): Promise<SuggestionQueueState> {
    const state: SuggestionQueueState = {
      suggestion_ids: suggestionIds,
      current_index: 0,
      completed: suggestionIds.length === 0,
    };
    await this.persistQueue(documentId, factoryId, state);
    return state;
  }

  async getQueueState(
    documentId: number,
    factoryId: number,
  ): Promise<SuggestionQueueState | null> {
    const doc = await this.repository.findDocumentById(documentId, factoryId);
    if (!doc) return null;
    const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
    return (metadata.suggestion_queue as SuggestionQueueState) ?? null;
  }

  async getCurrentSuggestionId(
    documentId: number,
    factoryId: number,
  ): Promise<number | null> {
    const state = await this.getQueueState(documentId, factoryId);
    if (!state || state.completed) return null;
    return state.suggestion_ids[state.current_index] ?? null;
  }

  async advanceQueue(
    documentId: number,
    factoryId: number,
  ): Promise<{ nextSuggestionId: number | null; completed: boolean }> {
    const state = await this.getQueueState(documentId, factoryId);
    if (!state) {
      throw new NotFoundException(`Queue not found for document #${documentId}`);
    }

    const nextIndex = state.current_index + 1;
    if (nextIndex >= state.suggestion_ids.length) {
      const completedState: SuggestionQueueState = {
        ...state,
        completed: true,
      };
      await this.persistQueue(documentId, factoryId, completedState);
      return { nextSuggestionId: null, completed: true };
    }

    const updated: SuggestionQueueState = {
      ...state,
      current_index: nextIndex,
    };
    await this.persistQueue(documentId, factoryId, updated);
    return {
      nextSuggestionId: state.suggestion_ids[nextIndex],
      completed: false,
    };
  }

  async countRemainingPending(
    documentId: number,
    factoryId: number,
  ): Promise<number> {
    const suggestions = await this.repository.listSuggestions(
      documentId,
      factoryId,
    );
    return suggestions.filter((s) => s.status === SUGGESTION_STATUS.PENDING)
      .length;
  }

  private async persistQueue(
    documentId: number,
    factoryId: number,
    state: SuggestionQueueState,
  ) {
    const doc = await this.repository.findDocumentById(documentId, factoryId);
    if (!doc) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }
    const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
    await this.repository.updateDocument(documentId, factoryId, {
      metadata: { ...metadata, suggestion_queue: state },
    });
  }
}
