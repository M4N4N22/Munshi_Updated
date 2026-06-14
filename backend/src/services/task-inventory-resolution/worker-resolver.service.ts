import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import { FactoryUser } from 'src/services/factories/factories.schema';
import { User } from 'src/services/users/users.schema';
import { USER_ROLE } from 'src/services/users/users.constants';
import {
  FactoryMemberSummary,
  WorkerCandidate,
  WorkerMatchResult,
} from './task-inventory-resolution.interfaces';
import {
  RESOLVER_FUZZY_MIN_GAP,
  RESOLVER_FUZZY_THRESHOLD,
  RESOLVER_MAX_CANDIDATES,
  RESOLVER_PARTIAL_MIN_HINT_LEN,
} from './task-inventory-resolution.constants';
import { bestFuzzyMatches, similarityRatio } from './fuzzy-match.util';

@Injectable()
export class WorkerResolverService {
  private readonly factoryUserModel: typeof FactoryUser;
  private readonly userModel: typeof User;

  constructor(private readonly dbService: DbService) {
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
    this.userModel = this.dbService.sqlService.User;
  }

  async resolve(
    factoryId: number,
    hint: string | null | undefined,
  ): Promise<WorkerMatchResult> {
    const normalized = hint?.trim().replace(/^@+/, '').trim();
    if (!normalized) {
      return { status: 'not_found' };
    }

    const members = await this.listAssignableMembers(factoryId);
    if (members.length === 0) {
      return { status: 'not_found' };
    }

    const lowerHint = normalized.toLowerCase();

    const exactMatches = members.filter(
      (member) => member.name.trim().toLowerCase() === lowerHint,
    );
    if (exactMatches.length === 1) {
      return this.toResolved(exactMatches[0], 'exact');
    }
    if (exactMatches.length > 1) {
      return this.toAmbiguous(exactMatches, 'exact');
    }

    const tokenMatches = members.filter((member) =>
      this.nameTokens(member.name).some((token) => token === lowerHint),
    );
    if (tokenMatches.length === 1) {
      return this.toResolved(tokenMatches[0], 'case_insensitive');
    }
    if (tokenMatches.length > 1) {
      return this.toAmbiguous(tokenMatches, 'case_insensitive');
    }

    if (lowerHint.length >= RESOLVER_PARTIAL_MIN_HINT_LEN) {
      const partialMatches = members.filter((member) => {
        const name = member.name.toLowerCase();
        return (
          name.includes(lowerHint) ||
          this.nameTokens(member.name).some((token) =>
            token.startsWith(lowerHint),
          )
        );
      });

      if (partialMatches.length === 1) {
        return this.toResolved(partialMatches[0], 'partial');
      }
      if (partialMatches.length > 1) {
        return this.toAmbiguous(partialMatches, 'partial');
      }
    }

    const fuzzyHits = bestFuzzyMatches(
      normalized,
      members,
      (member) => member.name,
      RESOLVER_FUZZY_THRESHOLD,
      RESOLVER_MAX_CANDIDATES,
    );

    const tokenFuzzy = members
      .map((member) => ({
        member,
        score: Math.max(
          ...this.nameTokens(member.name).map((token) =>
            similarityRatio(normalized, token),
          ),
          0,
        ),
      }))
      .filter((entry) => entry.score >= RESOLVER_FUZZY_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    const merged = this.mergeFuzzyHits(fuzzyHits, tokenFuzzy);
    if (merged.length === 0) {
      return { status: 'not_found' };
    }

    if (merged.length === 1) {
      return this.toResolved(merged[0].member, 'fuzzy');
    }

    const top = merged[0];
    const second = merged[1];
    if (top.score - second.score >= RESOLVER_FUZZY_MIN_GAP) {
      return this.toResolved(top.member, 'fuzzy');
    }

    return {
      status: 'ambiguous',
      candidates: merged
        .slice(0, RESOLVER_MAX_CANDIDATES)
        .map(({ member, score }) => this.toCandidate(member, 'fuzzy', score)),
    };
  }

  private async listAssignableMembers(
    factoryId: number,
  ): Promise<FactoryMemberSummary[]> {
    const rows = await this.factoryUserModel.findAll({
      where: {
        factory_id: factoryId,
        role: { [Op.in]: [USER_ROLE.WORKER, USER_ROLE.MANAGER] },
      },
      include: [
        {
          model: this.userModel,
          as: 'user',
          required: true,
          attributes: ['id', 'name'],
        },
      ],
      order: [['user_id', 'ASC']],
    });

    return rows
      .map((row) => ({
        user_id: row.user_id,
        name: (row as any).user?.name?.trim() ?? '',
      }))
      .filter((member) => member.name.length > 0);
  }

  private nameTokens(name: string): string[] {
    return name
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  private mergeFuzzyHits(
    fullNameHits: Array<{ item: FactoryMemberSummary; score: number }>,
    tokenHits: Array<{ member: FactoryMemberSummary; score: number }>,
  ) {
    const byId = new Map<number, { member: FactoryMemberSummary; score: number }>();
    for (const hit of fullNameHits) {
      byId.set(hit.item.user_id, { member: hit.item, score: hit.score });
    }
    for (const hit of tokenHits) {
      const existing = byId.get(hit.member.user_id);
      if (!existing || hit.score > existing.score) {
        byId.set(hit.member.user_id, hit);
      }
    }
    return [...byId.values()].sort((a, b) => b.score - a.score);
  }

  private toResolved(
    member: FactoryMemberSummary,
    match_type: WorkerMatchResult['match_type'],
  ): WorkerMatchResult {
    return {
      status: 'resolved',
      user_id: member.user_id,
      name: member.name,
      match_type,
    };
  }

  private toAmbiguous(
    members: FactoryMemberSummary[],
    match_type: WorkerCandidate['match_type'],
  ): WorkerMatchResult {
    return {
      status: 'ambiguous',
      candidates: members
        .slice(0, RESOLVER_MAX_CANDIDATES)
        .map((member) => this.toCandidate(member, match_type)),
    };
  }

  private toCandidate(
    member: FactoryMemberSummary,
    match_type: WorkerCandidate['match_type'],
    score?: number,
  ): WorkerCandidate {
    return {
      user_id: member.user_id,
      name: member.name,
      match_type,
      ...(score != null ? { score: Number(score.toFixed(4)) } : {}),
    };
  }
}
