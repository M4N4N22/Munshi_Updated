import { Injectable, Logger } from '@nestjs/common';
import { AttendanceService } from 'src/services/attendance/attendance.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { ReportService } from 'src/services/reports/reports.service';
import { TasksService } from 'src/services/tasks/tasks.service';
import { UserService } from 'src/services/users/users.service';
import { WorkflowRouterService } from 'src/services/workflow/workflow-engine.service';
import { WORKFLOW_TYPE } from 'src/services/workflow/workflow.constants';
import { waSection, waTaskAssigned } from 'src/modules/whatsapp/whatsapp.templates';
import {
  DEMO_PHRASE,
  DEMO_STEEL_SKU,
  isDemoModeEnabled,
  normalizeDemoPhrase,
  PROCUREMENT_PHRASES,
  resolveDemoPhraseKey,
} from './demo-mode.constants';

export interface DemoModeHandleResult {
  handled: true;
  response: string;
  route: string;
}

/**
 * Temporary demo safeguard — intercepts certified phrases before ML/session routing.
 * Inactive unless DEMO_MODE=true.
 */
@Injectable()
export class DemoModeService {
  private readonly logger = new Logger(DemoModeService.name);

  constructor(
    private readonly usersService: UserService,
    private readonly attendanceService: AttendanceService,
    private readonly tasksService: TasksService,
    private readonly inventoryService: InventoryService,
    private readonly reportService: ReportService,
    private readonly workflowRouter: WorkflowRouterService,
  ) {}

  isEnabled(): boolean {
    return isDemoModeEnabled();
  }

  matchesCertifiedPhrase(message: string): boolean {
    return resolveDemoPhraseKey(message) !== null;
  }

  async tryHandle(
    phone: string,
    message: string,
  ): Promise<DemoModeHandleResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const norm = resolveDemoPhraseKey(message);
    if (!norm) {
      return null;
    }

    this.logger.log(`demo-mode intercept phone=${phone} phrase="${norm}"`);

    if (PROCUREMENT_PHRASES.has(norm)) {
      const response = await this.handleProcurement(phone, message);
      return { handled: true, response, route: 'procurement_workflow' };
    }

    const user = await this.usersService.findByPhone(phone);
    const factoryId = user?.factory_links?.factory_id;
    const userId = user?.id;
    if (!user || !factoryId || !userId) {
      return {
        handled: true,
        response: waSection(
          'Registration required',
          'Your number is not registered with Munshi. Please contact your factory owner.',
        ),
        route: 'error_not_registered',
      };
    }

    await this.clearActiveWorkflow(phone);

    switch (norm) {
      case DEMO_PHRASE.ATTENDANCE: {
        const response = await this.attendanceService.markAttendance(
          userId,
          factoryId,
          true,
        );
        return { handled: true, response, route: 'attendance_mark' };
      }

      case DEMO_PHRASE.TASK_ASSIGN: {
        const taskDescription = 'store check ka kaam';
        const result = await this.tasksService.handleAssign(
          userId,
          factoryId,
          'rahul kumar',
          taskDescription,
          {},
        );
        const response =
          typeof result === 'string'
            ? waTaskAssigned(taskDescription, result)
            : (result?.message as string) ||
              waSection('Task assigned', 'Task assigned to Rahul Kumar.');
        return { handled: true, response, route: 'task_assign' };
      }

      case DEMO_PHRASE.INVENTORY: {
        const response = await this.buildInventoryResponse(factoryId);
        return { handled: true, response, route: 'inventory_status' };
      }

      case DEMO_PHRASE.REPORT: {
        const response = await this.reportService.generateReport(
          factoryId,
          undefined,
        );
        return {
          handled: true,
          response: typeof response === 'string' ? response : String(response),
          route: 'report',
        };
      }

      case DEMO_PHRASE.DISCOVERY: {
        const response = await this.workflowRouter.startWorkflowIfRegistered(
          phone,
          '/business_discovery',
        );
        return {
          handled: true,
          response: response ?? waSection('Business setup', 'Business discovery could not be started.'),
          route: 'business_discovery_start',
        };
      }

      case DEMO_PHRASE.DOCUMENT_UPLOAD: {
        return {
          handled: true,
          response: waSection(
            'Document received',
            'Your inventory file has been received.\n\n' +
              '*Items identified:* 5 SKUs\n' +
              '• Steel Sheets\n' +
              '• Aluminium Rods\n' +
              '• Copper Wire\n' +
              '• Packaging Cartons\n' +
              '• Safety Gloves\n\n' +
              'Import suggestions are ready for your review.',
          ),
          route: 'document_upload_demo',
        };
      }

      default:
        return null;
    }
  }

  private async clearActiveWorkflow(phone: string): Promise<void> {
    const resolved = await this.workflowRouter.resolveActiveSession(phone);
    if (resolved.session) {
      await this.workflowRouter.cancelWorkflow(phone);
    }
  }

  private async handleProcurement(
    phone: string,
    message: string,
  ): Promise<string> {
    const norm = normalizeDemoPhrase(message);
    const resolved = await this.workflowRouter.resolveActiveSession(phone);
    const active = resolved.session;

    if (
      active &&
      active.workflow_type !== WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE
    ) {
      await this.workflowRouter.cancelWorkflow(phone);
    }

    if (norm === DEMO_PHRASE.PR_START) {
      const again = await this.workflowRouter.resolveActiveSession(phone);
      if (
        again.session?.workflow_type ===
        WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE
      ) {
        return await this.workflowRouter.handleActiveWorkflowMessage(
          phone,
          message,
        );
      }
      const started = await this.workflowRouter.startWorkflowIfRegistered(
        phone,
        '/purchase_request_create',
      );
      return (
        started ??
        waSection(
          'Purchase request',
          'Could not start purchase request workflow.',
        )
      );
    }

    const prSession = (
      await this.workflowRouter.resolveActiveSession(phone)
    ).session;
    if (
      !prSession ||
      prSession.workflow_type !== WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE
    ) {
      await this.workflowRouter.startWorkflowIfRegistered(
        phone,
        '/purchase_request_create',
      );
    }

    const result = await this.workflowRouter.handleActiveWorkflowMessage(
      phone,
      message,
    );

    const stillActive = await this.workflowRouter.hasActiveSession(phone);
    if (norm === DEMO_PHRASE.PR_YES && !stillActive) {
      return (
        `${result}\n\n` +
        `*Vendor confirmation received*\n` +
        `Expected delivery: *within 5–7 business days*`
      );
    }

    return result;
  }

  private async buildInventoryResponse(factoryId: number): Promise<string> {
    try {
      const status = await this.inventoryService.getInventoryStatusBySku(
        factoryId,
        DEMO_STEEL_SKU,
      );
      return waSection(
        'Inventory status',
        `*${status.name}*\n\n` +
          `Current Stock: *${status.current_quantity}* ${status.unit}\n\n` +
          `Location:\n${status.location_name}\n\n` +
          `Status:\n${status.is_low_stock ? 'Low Stock' : 'In Stock'}`,
      );
    } catch {
      return waSection(
        'Inventory status',
        `*Steel Sheets*\n\n` +
          `Current Stock: *120* sheets\n\n` +
          `Location:\nMain Warehouse\n\n` +
          `Status:\nIn Stock`,
      );
    }
  }
}
