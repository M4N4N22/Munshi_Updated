import { Injectable } from '@nestjs/common';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { FactoryService } from 'src/services/factories/factories.service';
import { UserService } from 'src/services/users/users.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { WorkerOnboardingService } from 'src/services/workflow/worker-onboarding.service';
import {
  normalizeWorkerDoj,
  normalizeWorkerName,
  normalizeWorkerPhone,
  resolveDepartmentSelection,
  type DepartmentOption,
} from 'src/services/workflow/worker-onboarding.validation';
import { parseTeamCsvText, type TeamCsvRow } from 'src/modules/whatsapp/team-csv.parse';
import {
  TEAM_CSV_MAX_BYTES,
  TEAM_CSV_MAX_ROWS,
} from 'src/modules/whatsapp/team-csv.constants';

export type TeamCsvImportRowResult = {
  line: number;
  name: string;
  status: 'added' | 'skipped' | 'failed';
  detail: string;
  welcome_phone?: string;
  welcome_name?: string;
};

export type TeamCsvImportSummary = {
  added: number;
  skipped: number;
  failed: number;
  results: TeamCsvImportRowResult[];
  pending_welcomes: Array<{ phone: string; name: string }>;
};

@Injectable()
export class TeamCsvImportService {
  constructor(
    private readonly workerOnboarding: WorkerOnboardingService,
    private readonly departmentsService: DepartmentsService,
    private readonly factoryService: FactoryService,
    private readonly usersService: UserService,
  ) {}

  parseBuffer(buffer: Buffer): { ok: true; rows: TeamCsvRow[] } | { ok: false; error: string } {
    if (buffer.length > TEAM_CSV_MAX_BYTES) {
      return {
        ok: false,
        error: `CSV 2 MB se chhoti honi chahiye.`,
      };
    }
    const parsed = parseTeamCsvText(buffer.toString('utf8'));
    if (!parsed.ok) {
      return parsed;
    }
    if (parsed.rows.length > TEAM_CSV_MAX_ROWS) {
      return {
        ok: false,
        error: `Ek baar mein maximum ${TEAM_CSV_MAX_ROWS} employees.`,
      };
    }
    return parsed;
  }

  async importRows(
    factoryId: number,
    ownerUserId: number,
    rows: TeamCsvRow[],
    options?: { sendWelcome?: boolean },
  ): Promise<TeamCsvImportSummary> {
    const sendWelcome = options?.sendWelcome ?? true;
    let departments = await this.departmentsService.listByFactory(factoryId);
    if (!departments.length) {
      await this.departmentsService.ensureDefaultDepartment(
        factoryId,
        ownerUserId,
      );
      departments = await this.departmentsService.listByFactory(factoryId);
    }
    const deptOptions = departments.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
    }));

    if (!deptOptions.length) {
      throw new Error(
        'Pehle kam se kam ek department set karein, phir team CSV dubara upload karein.',
      );
    }

    const results: TeamCsvImportRowResult[] = [];
    const pendingWelcomes: Array<{ phone: string; name: string }> = [];

    for (const row of rows) {
      const result = await this.importOneRow(
        factoryId,
        ownerUserId,
        row,
        deptOptions,
        sendWelcome,
      );
      results.push(result);
      if (result.welcome_phone && result.welcome_name) {
        pendingWelcomes.push({
          phone: result.welcome_phone,
          name: result.welcome_name,
        });
      }
    }

    return {
      added: results.filter((r) => r.status === 'added').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
      pending_welcomes: pendingWelcomes,
    };
  }

  private async resolveOrCreateDepartment(
    factoryId: number,
    ownerUserId: number,
    rawDept: string,
    deptOptions: DepartmentOption[],
  ): Promise<DepartmentOption> {
    try {
      return resolveDepartmentSelection(rawDept, deptOptions);
    } catch {
      const created = await this.departmentsService.findOrCreateByName(
        factoryId,
        rawDept,
        ownerUserId,
      );
      const option = {
        id: created.id,
        name: created.name,
        slug: created.slug,
      };
      deptOptions.push(option);
      return option;
    }
  }

  private async importOneRow(
    businessId: number,
    ownerUserId: number,
    row: TeamCsvRow,
    deptOptions: DepartmentOption[],
    sendWelcome: boolean,
  ): Promise<TeamCsvImportRowResult> {
    const base = { line: row.line, name: row.name || `Row ${row.line}` };

    try {
      const name = normalizeWorkerName(row.name);
      const phone = normalizeWorkerPhone(row.phone);
      const roleRaw = row.role.trim().toUpperCase();
      if (roleRaw !== USER_ROLE.WORKER && roleRaw !== USER_ROLE.MANAGER) {
        return {
          ...base,
          status: 'failed',
          detail: 'role WORKER ya MANAGER honi chahiye',
        };
      }

      const dept = await this.resolveOrCreateDepartment(
        businessId,
        ownerUserId,
        row.department,
        deptOptions,
      );
      let doj: Date | null = null;
      if (row.doj.trim()) {
        doj = normalizeWorkerDoj(row.doj);
      }

      const existing = await this.usersService.findByPhone(phone);
      if (existing?.id) {
        const link = existing.factory_links;
        if (link?.factory_id === businessId) {
          return {
            ...base,
            status: 'skipped',
            detail: 'pehle se is business mein jud chuka hai',
          };
        }
        if (link?.factory_id) {
          return {
            ...base,
            status: 'failed',
            detail: 'ye number kisi aur business mein registered hai',
          };
        }
        await this.factoryService.assignMember({
          factory_id: String(businessId),
          user_id: String(existing.id),
          role: roleRaw as USER_ROLE,
        });
        await this.departmentsService.addWorker(dept.id, {
          user_id: existing.id,
        });
        if (doj) {
          const members = await this.factoryService.getFactoryUsers(businessId);
          const fu = (members as { user_id?: number; id?: number }[]).find(
            (m) => Number(m.user_id) === Number(existing.id),
          );
          if (fu?.id) {
            await this.factoryService.updateFactoryUser(fu.id, {
              doj: doj.toISOString().slice(0, 10),
            });
          }
        }
        if (!sendWelcome) {
          return {
            ...base,
            name,
            status: 'added',
            detail: 'juda (pehle se account tha)',
            welcome_phone: phone,
            welcome_name: name,
          };
        }
        await this.workerOnboarding.sendWelcome(phone, name);
        return {
          ...base,
          name,
          status: 'added',
          detail: 'juda (pehle se account tha)',
        };
      }

      await this.workerOnboarding.onboardWorker({
        factoryId: businessId,
        name,
        phoneNumber: phone,
        departmentId: dept.id,
        role: roleRaw as USER_ROLE.WORKER | USER_ROLE.MANAGER,
        doj,
        sendWelcome,
      });

      if (!sendWelcome) {
        return {
          ...base,
          name,
          status: 'added',
          detail: 'add ho gaya',
          welcome_phone: phone,
          welcome_name: name,
        };
      }

      return { ...base, name, status: 'added', detail: 'add ho gaya' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...base, status: 'failed', detail: msg.slice(0, 120) };
    }
  }
}
