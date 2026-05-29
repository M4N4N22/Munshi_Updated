import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  WORKFLOW_STATUS,
  WorkflowStatus,
  WorkflowType,
} from './workflow.constants';
import { IWorkflowSessionRecord } from './workflow.interfaces';
import { WorkflowSessionRepository } from './workflow-session.repository';
import { WorkflowSession } from './workflow.schema';

export interface CreateWorkflowSessionInput {
  factory_id: number;
  phone_number: string;
  workflow_type: WorkflowType;
  current_step: string;
  session_data?: Record<string, unknown>;
}

@Injectable()
export class WorkflowSessionService {
  constructor(private readonly repository: WorkflowSessionRepository) {}

  async createSession(
    input: CreateWorkflowSessionInput,
  ): Promise<IWorkflowSessionRecord> {
    const existing = await this.getActiveSession(input.phone_number);
    if (existing) {
      throw new ConflictException(
        'You already have an active workflow. Please complete or cancel it before starting a new one.',
      );
    }

    const row = await this.repository.model.create({
      factory_id: input.factory_id,
      phone_number: input.phone_number,
      workflow_type: input.workflow_type,
      current_step: input.current_step,
      session_data: input.session_data ?? {},
      status: WORKFLOW_STATUS.ACTIVE,
    } as any);

    return this.toRecord(row);
  }

  async getSession(id: number): Promise<IWorkflowSessionRecord | null> {
    const row = await this.repository.model.findByPk(id);
    return row ? this.toRecord(row) : null;
  }

  async getActiveSession(
    phoneNumber: string,
  ): Promise<IWorkflowSessionRecord | null> {
    const row = await this.repository.model.findOne({
      where: {
        phone_number: phoneNumber,
        status: WORKFLOW_STATUS.ACTIVE,
      },
      order: [['id', 'DESC']],
    });
    return row ? this.toRecord(row) : null;
  }

  async updateSession(
    id: number,
    patch: {
      current_step?: string;
      session_data?: Record<string, unknown>;
      status?: WorkflowStatus;
    },
  ): Promise<IWorkflowSessionRecord> {
    const row = await this.repository.model.findByPk(id);
    if (!row) {
      throw new NotFoundException(`Workflow session #${id} not found`);
    }
    if (row.status !== WORKFLOW_STATUS.ACTIVE) {
      throw new BadRequestException('Workflow session is not active');
    }

    await row.update(patch as any);
    return this.toRecord(row);
  }

  async completeSession(id: number): Promise<IWorkflowSessionRecord> {
    return this.setTerminalStatus(id, WORKFLOW_STATUS.COMPLETED);
  }

  async cancelSession(id: number): Promise<IWorkflowSessionRecord> {
    return this.setTerminalStatus(id, WORKFLOW_STATUS.CANCELLED);
  }

  async expireSession(id: number): Promise<IWorkflowSessionRecord> {
    return this.setTerminalStatus(id, WORKFLOW_STATUS.EXPIRED);
  }

  private async setTerminalStatus(
    id: number,
    status: WorkflowStatus,
  ): Promise<IWorkflowSessionRecord> {
    const row = await this.repository.model.findByPk(id);
    if (!row) {
      throw new NotFoundException(`Workflow session #${id} not found`);
    }
    if (row.status !== WORKFLOW_STATUS.ACTIVE) {
      return this.toRecord(row);
    }
    await row.update({ status } as any);
    return this.toRecord(row);
  }

  private toRecord(row: WorkflowSession): IWorkflowSessionRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      phone_number: row.phone_number,
      workflow_type: row.workflow_type as WorkflowType,
      current_step: row.current_step,
      session_data: (row.session_data ?? {}) as Record<string, unknown>,
      status: row.status as WorkflowStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
