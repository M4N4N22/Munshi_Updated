import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Factory } from 'src/services/factories/factories.schema';
import { USER_ROLE } from 'src/services/users/users.constants';
import {
  InventoryCsvUploadFile,
  InventoryImportUploadService,
} from 'src/services/inventory/inventory-import-upload.service';
import { TeamCsvImportService } from 'src/services/team-import/team-csv-import.service';
import { WorkerOnboardingService } from 'src/services/workflow/worker-onboarding.service';
import { IntegrationRepository } from 'src/services/integrations/integration.repository';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { INTEGRATION_PROVIDER } from 'src/services/integrations/integration.constants';
import {
  ONBOARDING_SETUP_STATUS,
  PendingWelcome,
} from './onboarding-setup.constants';
import {
  OnboardingSetupTokenPayload,
  OnboardingSetupTokenService,
} from './onboarding-setup-token.service';
import {
  INVENTORY_CSV_PUBLIC_TEMPLATE_URL,
} from 'src/modules/whatsapp/inventory-csv.constants';
import { TEAM_CSV_PUBLIC_TEMPLATE_URL } from 'src/modules/whatsapp/team-csv.constants';

export type OnboardingSetupStatusResponse = {
  factory_id: number;
  user_id: number;
  company_name: string;
  inventory_status: string;
  team_status: string;
  completed: boolean;
  stock_item_count: number;
  employee_count: number;
  zoho_connected: boolean;
  inventory_template_url: string;
  team_template_url: string;
  pending_welcome_count: number;
};

@Injectable()
export class OnboardingSetupService {
  constructor(
    private readonly dbService: DbService,
    private readonly tokenService: OnboardingSetupTokenService,
    private readonly inventoryImportUpload: InventoryImportUploadService,
    private readonly teamCsvImport: TeamCsvImportService,
    private readonly workerOnboarding: WorkerOnboardingService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly departmentsService: DepartmentsService,
  ) {}

  createSetupToken(payload: {
    factory_id: number;
    user_id: number;
    phone: string;
  }): string {
    return this.tokenService.createToken(payload);
  }

  async getStatus(setupToken: string): Promise<OnboardingSetupStatusResponse> {
    const ctx = await this.resolveContext(setupToken);
    const factory = await this.getFactory(ctx.factory_id);
    const pending = this.readPendingWelcomes(factory);

    const stock = await this.dbService.sqlService.InventoryItem.count({
      where: { factory_id: ctx.factory_id, is_active: true },
    });
    const members = await this.dbService.sqlService.FactoryUser.findAll({
      where: { factory_id: ctx.factory_id },
    });
    const employeeCount = members.filter((m) => {
      const role = String(m.role || '').toUpperCase();
      return role === USER_ROLE.WORKER || role === USER_ROLE.MANAGER;
    }).length;

    const zoho = await this.integrationRepository.findActiveConnectionByProvider(
      ctx.factory_id,
      INTEGRATION_PROVIDER.ZOHO_INVENTORY,
    );

    return {
      factory_id: ctx.factory_id,
      user_id: ctx.user_id,
      company_name: factory.name,
      inventory_status: factory.onboarding_inventory_status ?? ONBOARDING_SETUP_STATUS.PENDING,
      team_status: factory.onboarding_team_status ?? ONBOARDING_SETUP_STATUS.PENDING,
      completed: Boolean(factory.onboarding_completed_at),
      stock_item_count: stock,
      employee_count: employeeCount,
      zoho_connected: Boolean(zoho),
      inventory_template_url: INVENTORY_CSV_PUBLIC_TEMPLATE_URL,
      team_template_url: TEAM_CSV_PUBLIC_TEMPLATE_URL,
      pending_welcome_count: pending.length,
    };
  }

  async previewInventory(
    setupToken: string,
    file: InventoryCsvUploadFile | undefined,
  ) {
    const ctx = await this.resolveContext(setupToken);
    const rows = this.inventoryImportUpload.parseCsvFile(file);
    const review = await this.inventoryImportUpload.buildImportReview(
      ctx.factory_id,
      rows,
    );
    const previewLimit = 8;
    return {
      row_count: rows.length,
      preview_rows: rows.slice(0, previewLimit).map((row) => ({
        line: row.line,
        sku: row.sku,
        name: row.name,
        category: row.category,
        location: row.location,
        unit: row.unit,
        quantity: row.quantity,
        reorder_threshold: row.reorder_threshold,
      })),
      has_more_rows: rows.length > previewLimit,
      review,
    };
  }

  async importInventory(
    setupToken: string,
    file: InventoryCsvUploadFile | undefined,
  ) {
    const ctx = await this.resolveContext(setupToken);
    const rows = this.inventoryImportUpload.parseCsvFile(file);
    const review = await this.inventoryImportUpload.buildImportReview(
      ctx.factory_id,
      rows,
    );
    const summary = await this.inventoryImportUpload.processImportWithProvisioning(
      {
        factory_id: ctx.factory_id,
        created_by: ctx.user_id,
      },
      rows,
      review,
    );

    await this.updateFactory(ctx.factory_id, {
      onboarding_inventory_status: ONBOARDING_SETUP_STATUS.COMPLETED,
    });

    return {
      inventory_status: ONBOARDING_SETUP_STATUS.COMPLETED,
      summary: {
        added: summary.addedCount,
        updated: summary.updatedCount,
        failed: summary.failedCount,
        skipped: summary.skippedCount,
        categories_created: summary.categoriesCreatedCount ?? 0,
        locations_created: summary.locationsCreatedCount ?? 0,
      },
    };
  }

  async skipInventory(setupToken: string) {
    const ctx = await this.resolveContext(setupToken);
    await this.updateFactory(ctx.factory_id, {
      onboarding_inventory_status: ONBOARDING_SETUP_STATUS.SKIPPED,
    });
    return { inventory_status: ONBOARDING_SETUP_STATUS.SKIPPED };
  }

  async markInventoryFromZoho(setupToken: string) {
    const ctx = await this.resolveContext(setupToken);
    const zoho = await this.integrationRepository.findActiveConnectionByProvider(
      ctx.factory_id,
      INTEGRATION_PROVIDER.ZOHO_INVENTORY,
    );
    if (!zoho) {
      throw new BadRequestException(
        'Zoho abhi connected nahi hai. Pehle Zoho connect karein.',
      );
    }
    await this.updateFactory(ctx.factory_id, {
      onboarding_inventory_status: ONBOARDING_SETUP_STATUS.COMPLETED,
    });
    return { inventory_status: ONBOARDING_SETUP_STATUS.COMPLETED };
  }

  async previewTeam(
    setupToken: string,
    file: InventoryCsvUploadFile | undefined,
  ) {
    const ctx = await this.resolveContext(setupToken);
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required.');
    }
    const parsed = this.teamCsvImport.parseBuffer(file.buffer);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }

    let workers = 0;
    let managers = 0;
    const departments = new Set<string>();
    for (const row of parsed.rows) {
      const role = String(row.role || '').toUpperCase();
      if (role === 'MANAGER') {
        managers += 1;
      } else {
        workers += 1;
      }
      const dept = row.department?.trim();
      if (dept) {
        departments.add(dept);
      }
    }

    const previewLimit = 8;
    return {
      row_count: parsed.rows.length,
      preview_rows: parsed.rows.slice(0, previewLimit).map((row) => ({
        line: row.line,
        name: row.name,
        phone: row.phone,
        role: row.role,
        department: row.department,
        doj: row.doj,
      })),
      has_more_rows: parsed.rows.length > previewLimit,
      summary: {
        workers,
        managers,
        departments: [...departments].sort(),
      },
    };
  }

  async importTeam(setupToken: string, file: InventoryCsvUploadFile | undefined) {
    const ctx = await this.resolveContext(setupToken);
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required.');
    }
    const parsed = this.teamCsvImport.parseBuffer(file.buffer);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }

    const factory = await this.getFactory(ctx.factory_id);
    const existingPending = this.readPendingWelcomes(factory);

    await this.departmentsService.ensureDefaultDepartment(
      ctx.factory_id,
      ctx.user_id,
    );

    const summary = await this.teamCsvImport.importRows(
      ctx.factory_id,
      ctx.user_id,
      parsed.rows,
      { sendWelcome: false },
    );

    const merged = this.mergePendingWelcomes(
      existingPending,
      summary.pending_welcomes,
    );
    await this.updateFactory(ctx.factory_id, {
      onboarding_team_status: ONBOARDING_SETUP_STATUS.COMPLETED,
      onboarding_pending_welcomes: merged,
    });

    return {
      team_status: ONBOARDING_SETUP_STATUS.COMPLETED,
      summary: {
        added: summary.added,
        skipped: summary.skipped,
        failed: summary.failed,
        pending_welcome_count: merged.length,
      },
      failed_rows: summary.results
        .filter((r) => r.status === 'failed')
        .slice(0, 8),
    };
  }

  async skipTeam(setupToken: string) {
    const ctx = await this.resolveContext(setupToken);
    await this.updateFactory(ctx.factory_id, {
      onboarding_team_status: ONBOARDING_SETUP_STATUS.SKIPPED,
    });
    return { team_status: ONBOARDING_SETUP_STATUS.SKIPPED };
  }

  async complete(
    setupToken: string,
    options?: { notify_employees?: boolean },
  ): Promise<{
    completed: boolean;
    welcomes_sent: number;
    welcomes_failed: number;
    inventory_status: string;
    team_status: string;
  }> {
    const ctx = await this.resolveContext(setupToken);
    const factory = await this.getFactory(ctx.factory_id);
    const notify = options?.notify_employees !== false;
    const pending = this.readPendingWelcomes(factory);

    let welcomes_sent = 0;
    let welcomes_failed = 0;

    if (notify && pending.length > 0) {
      for (const row of pending) {
        try {
          await this.workerOnboarding.sendWelcome(row.phone, row.name);
          welcomes_sent += 1;
        } catch {
          welcomes_failed += 1;
        }
      }
    }

    await this.updateFactory(ctx.factory_id, {
      onboarding_completed_at: new Date(),
      onboarding_pending_welcomes: [],
    });

    return {
      completed: true,
      welcomes_sent,
      welcomes_failed,
      inventory_status: factory.onboarding_inventory_status,
      team_status: factory.onboarding_team_status,
    };
  }

  private async resolveContext(
    setupToken: string,
  ): Promise<OnboardingSetupTokenPayload> {
    const payload = this.tokenService.verifyToken(setupToken);
    const link = await this.dbService.sqlService.FactoryUser.findOne({
      where: { user_id: payload.user_id, factory_id: payload.factory_id },
    });
    if (!link) {
      throw new ForbiddenException('Not a member of this company.');
    }
    if (String(link.role).toUpperCase() !== USER_ROLE.OWNER) {
      throw new ForbiddenException('Only the owner can complete web setup.');
    }
    return payload;
  }

  private async getFactory(factoryId: number): Promise<Factory> {
    const factory = await this.dbService.sqlService.Factory.findByPk(factoryId);
    if (!factory) {
      throw new NotFoundException('Company not found.');
    }
    return factory;
  }

  private async updateFactory(
    factoryId: number,
    patch: Partial<{
      onboarding_inventory_status: string;
      onboarding_team_status: string;
      onboarding_completed_at: Date;
      onboarding_pending_welcomes: PendingWelcome[];
    }>,
  ): Promise<void> {
    const factory = await this.getFactory(factoryId);
    await factory.update(patch as any);
  }

  private readPendingWelcomes(factory: Factory): PendingWelcome[] {
    const raw = factory.onboarding_pending_welcomes;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter(
      (row): row is PendingWelcome =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as PendingWelcome).phone === 'string' &&
        typeof (row as PendingWelcome).name === 'string',
    );
  }

  private mergePendingWelcomes(
    existing: PendingWelcome[],
    added: PendingWelcome[],
  ): PendingWelcome[] {
    const seen = new Set(existing.map((r) => r.phone));
    const out = [...existing];
    for (const row of added) {
      if (seen.has(row.phone)) {
        continue;
      }
      seen.add(row.phone);
      out.push(row);
    }
    return out;
  }
}
