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
  doj?: Date | null;
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

    const link = await this.factoryService.assignMember({
      factory_id: String(input.factoryId),
      phone_number: input.phoneNumber,
      name: input.name,
      role: USER_ROLE.WORKER,
    });

    if (input.doj) {
      await this.factoryService.updateFactoryUser(link.id, {
        doj: input.doj.toISOString().slice(0, 10),
      });
    }

    await this.departmentsService.addWorker(input.departmentId, {
      user_id: link.user_id,
    });

    const welcomeText = this.messagingService.buildWorkerWelcomeText({
      userName: input.name,
    });
    await this.messagingService.sendText(input.phoneNumber, welcomeText);

    return {
      userId: link.user_id,
      factoryUserId: link.id,
      departmentId: input.departmentId,
    };
  }
}
