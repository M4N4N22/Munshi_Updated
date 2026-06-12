import { BadRequestException, Injectable } from '@nestjs/common';
import { FactoryService } from 'src/services/factories/factories.service';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { USER_ROLE } from 'src/services/users/users.constants';

export interface OnboardWorkerInput {
  factoryId: number;
  name: string;
  phoneNumber: string;
  departmentId: number;
  role?: USER_ROLE.WORKER | USER_ROLE.MANAGER;
  doj?: Date | null;
  /** When false, caller sends welcome later (e.g. web onboarding batch). */
  sendWelcome?: boolean;
}

export interface OnboardWorkerResult {
  userId: number;
  factoryUserId: number;
  departmentId: number;
}

@Injectable()
export class WorkerOnboardingService {
  constructor(
    private readonly factoryService: FactoryService,
    private readonly departmentsService: DepartmentsService,
    private readonly messagingService: MessagingService,
  ) {}

  async onboardWorker(input: OnboardWorkerInput): Promise<OnboardWorkerResult> {
    const departments = await this.departmentsService.listByFactory(
      input.factoryId,
    );
    const department = departments.find((d) => d.id === input.departmentId);
    if (!department) {
      throw new BadRequestException(
        'Department not found in this factory. Please select a valid department.',
      );
    }

    const memberRole = input.role ?? USER_ROLE.WORKER;
    const link = await this.factoryService.assignMember({
      factory_id: String(input.factoryId),
      phone_number: input.phoneNumber,
      name: input.name,
      role: memberRole,
    });

    if (input.doj) {
      await this.factoryService.updateFactoryUser(link.id, {
        doj: input.doj.toISOString().slice(0, 10),
      });
    }

    // Department head handoff only when role step explicitly chose Manager.
    if (memberRole === USER_ROLE.MANAGER) {
      await this.departmentsService.assignDepartmentHead(
        input.departmentId,
        link.user_id,
        input.factoryId,
      );
    } else if (memberRole === USER_ROLE.WORKER) {
      await this.departmentsService.addWorker(input.departmentId, {
        user_id: link.user_id,
      });
    }

    if (input.sendWelcome !== false) {
      await this.sendWelcome(input.phoneNumber, input.name);
    }

    return {
      userId: link.user_id,
      factoryUserId: link.id,
      departmentId: input.departmentId,
    };
  }

  async sendWelcome(phoneNumber: string, name: string): Promise<void> {
    const welcomeText = this.messagingService.buildWorkerWelcomeText({
      userName: name,
    });
    await this.messagingService.sendText(phoneNumber, welcomeText);
  }
}
