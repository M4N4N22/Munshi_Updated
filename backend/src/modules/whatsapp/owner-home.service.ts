import { Injectable } from '@nestjs/common';
import { BusinessReadinessService } from './business-readiness.service';
import {
  buildAssignBlockedOutbound,
  buildAssignReadyOutbound,
  buildEmployeeAddMenuOutbound,
  buildOwnerHomeDemoText,
  buildOwnerHomeMenuOutbound,
  buildOwnerHomeSecondaryMenuOutbound,
  buildOwnerHomeWelcomeText,
} from 'src/core/messaging/owner-home-outbound';
import {
  waDashboardComingSoon,
  waNotRegistered,
  waOwnerOnlyHome,
  waWorkerWelcome,
} from 'src/core/messaging/owner-home.templates';
import {
  normalizeOutbound,
  type WaOutboundMessage,
} from 'src/core/messaging/outbound-message.types';
import { WA_INTERACTIVE_ID } from 'src/core/messaging/whatsapp-interactive.constants';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';
import { WorkflowRouterService } from 'src/services/workflow/workflow-engine.service';
import { WORKFLOW_START_COMMANDS } from 'src/services/workflow/workflow.constants';
import { TeamBulkImportService } from './team-bulk-import.service';
import { InventoryBulkImportService } from './inventory-bulk-import.service';
import { waGoogleFormRetired } from 'src/core/messaging/owner-home.templates';
import { buildTeamCsvOnboardingCta } from 'src/core/messaging/team-csv-onboarding.outbound';

export type OwnerHomeActionHandler = (
  phone: string,
  actionId: string,
) => Promise<void>;

@Injectable()
export class OwnerHomeService {
  constructor(
    private readonly usersService: UserService,
    private readonly readinessService: BusinessReadinessService,
    private readonly messagingService: MessagingService,
    private readonly workflowRouter: WorkflowRouterService,
    private readonly teamBulkImport: TeamBulkImportService,
    private readonly inventoryBulkImport: InventoryBulkImportService,
  ) {}

  async sendOwnerHome(
    phone: string,
    send: (to: string, o: WaOutboundMessage) => Promise<unknown>,
  ): Promise<void> {
    const ctx = await this.resolveContext(phone);
    if (!ctx) {
      await send(phone, { type: 'text', body: waNotRegistered() });
      return;
    }

    if (ctx.role === USER_ROLE.WORKER) {
      await send(phone, {
        type: 'text',
        body: waWorkerWelcome(ctx.userName),
      });
      return;
    }

    if (!this.isOwnerOrManager(ctx.role)) {
      await send(phone, { type: 'text', body: waOwnerOnlyHome() });
      return;
    }

    const readiness = await this.readinessService.getSnapshot(ctx.businessId);
    const welcome = buildOwnerHomeWelcomeText(ctx.userName, readiness);
    await this.messagingService.sendText(phone, welcome);

    const demo = buildOwnerHomeDemoText();
    if (demo.trim()) {
      await this.messagingService.sendText(phone, demo);
    }

    await send(phone, buildOwnerHomeMenuOutbound(readiness));
    await send(phone, buildOwnerHomeSecondaryMenuOutbound());
  }

  async handleHomeAction(
    phone: string,
    actionId: string,
    deps: {
      sendOutbound: (to: string, o: WaOutboundMessage) => Promise<unknown>;
      sendText: (to: string, body: string) => Promise<unknown>;
      handleTeamSetup: (phone: string, teamActionId: string) => Promise<void>;
      deliverHelp?: (phone: string) => Promise<unknown>;
      runSlashCommand?: (
        phone: string,
        command: string,
      ) => Promise<unknown>;
    },
  ): Promise<void> {
    const ctx = await this.resolveContext(phone);
    if (!ctx) {
      await deps.sendText(phone, waNotRegistered());
      return;
    }

    if (!this.isOwnerOrManager(ctx.role)) {
      await deps.sendText(phone, waOwnerOnlyHome());
      return;
    }

    const readiness = await this.readinessService.getSnapshot(ctx.businessId);

    switch (actionId) {
      case WA_INTERACTIVE_ID.HOME_ADD_EMPLOYEE:
        await deps.sendOutbound(phone, buildEmployeeAddMenuOutbound());
        return;

      case WA_INTERACTIVE_ID.HOME_ADD_STOCK: {
        const sessionState = await this.workflowRouter.resolveActiveSession(phone);
        if (sessionState.session) {
          await this.workflowRouter.cancelWorkflow(phone);
        }
        const msg = await this.workflowRouter.startWorkflowFromCommand(
          phone,
          WORKFLOW_START_COMMANDS.INVENTORY_CREATE,
        );
        await deps.sendOutbound(phone, normalizeOutbound(msg));
        return;
      }

      case WA_INTERACTIVE_ID.HOME_ASSIGN_TASK:
        if (!readiness.hasEmployees) {
          await deps.sendOutbound(phone, buildAssignBlockedOutbound());
          return;
        }
        await deps.sendOutbound(phone, buildAssignReadyOutbound());
        return;

      case WA_INTERACTIVE_ID.HOME_SHOW_HELP:
        if (deps.deliverHelp) {
          await deps.deliverHelp(phone);
        } else {
          await deps.sendText(
            phone,
            'Poori command list ke liye *help* likhein.',
          );
        }
        return;

      case WA_INTERACTIVE_ID.HOME_STOCK_STATUS:
        if (deps.runSlashCommand) {
          await deps.runSlashCommand(phone, '/inventory_status');
        } else {
          await deps.sendText(phone, 'Stock ke liye *low stock dikhao* likhein.');
        }
        return;

      case WA_INTERACTIVE_ID.HOME_SHOW_TEAM:
        if (deps.runSlashCommand) {
          await deps.runSlashCommand(phone, '/members');
        } else {
          await deps.sendText(phone, 'Team ke liye *show team* likhein.');
        }
        return;

      case WA_INTERACTIVE_ID.HOME_GO_HOME:
        await this.sendOwnerHome(phone, deps.sendOutbound);
        return;

      case WA_INTERACTIVE_ID.HOME_BULK_CSV:
        this.inventoryBulkImport.cancelAwaiting(phone);
        this.teamBulkImport.startAwaitingCsv(
          phone,
          ctx.businessId,
          ctx.userId,
        );
        await deps.sendOutbound(phone, buildTeamCsvOnboardingCta());
        return;

      case WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM:
        await deps.sendText(phone, waGoogleFormRetired());
        return;

      case WA_INTERACTIVE_ID.TEAM_DASHBOARD:
        await deps.sendText(phone, waDashboardComingSoon());
        return;

      case WA_INTERACTIVE_ID.TEAM_ONBOARD_WA:
        await deps.handleTeamSetup(phone, actionId);
        return;

      default:
        return;
    }
  }

  private async resolveContext(phone: string): Promise<{
    userId: number;
    userName: string;
    businessId: number;
    role: string;
  } | null> {
    const user = await this.usersService.findByPhone(phone);
    if (!user?.id) {
      return null;
    }
    let businessId: number | undefined = user.factory_links?.factory_id;
    let role: string | undefined = user.factory_links?.role;
    if (!businessId) {
      const members = await this.usersService.findOne(user.id);
      const link = (members as { factory_links?: { factory_id?: number; role?: string } })
        .factory_links;
      businessId = link?.factory_id;
      role = link?.role;
    }
    if (!businessId) {
      return null;
    }
    return {
      userId: user.id,
      userName: user.name || 'ji',
      businessId,
      role: role || '',
    };
  }

  private isOwnerOrManager(role: string): boolean {
    const r = (role || '').toUpperCase();
    return r === USER_ROLE.OWNER || r === USER_ROLE.MANAGER;
  }
}
