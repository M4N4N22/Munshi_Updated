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
} from 'src/services/workflow/worker-onboarding.validation';
import { waSection } from './whatsapp.templates';
import {
  TEAM_CSV_MAX_BYTES,
  TEAM_CSV_MAX_ROWS,
  TEAM_CSV_PENDING_TTL_MS,
} from './team-csv.constants';
import { parseTeamCsvText, type TeamCsvRow } from './team-csv.parse';

type PendingCsv = {
  businessId: number;
  ownerUserId: number;
  expiresAt: number;
};

export type BulkImportRowResult = {
  line: number;
  name: string;
  status: 'added' | 'skipped' | 'failed';
  detail: string;
};

@Injectable()
export class TeamBulkImportService {
  private readonly pendingByPhone = new Map<string, PendingCsv>();

  constructor(
    private readonly workerOnboarding: WorkerOnboardingService,
    private readonly departmentsService: DepartmentsService,
    private readonly factoryService: FactoryService,
    private readonly usersService: UserService,
  ) {}

  startAwaitingCsv(phone: string, businessId: number, ownerUserId: number): void {
    this.pendingByPhone.set(phone, {
      businessId,
      ownerUserId,
      expiresAt: Date.now() + TEAM_CSV_PENDING_TTL_MS,
    });
  }

  cancelAwaiting(phone: string): boolean {
    return this.pendingByPhone.delete(phone);
  }

  isAwaitingCsv(phone: string): boolean {
    const p = this.pendingByPhone.get(phone);
    if (!p) {
      return false;
    }
    if (Date.now() > p.expiresAt) {
      this.pendingByPhone.delete(phone);
      return false;
    }
    return true;
  }

  getPending(phone: string): PendingCsv | null {
    if (!this.isAwaitingCsv(phone)) {
      return null;
    }
    return this.pendingByPhone.get(phone) ?? null;
  }

  async importFromCsvBuffer(
    phone: string,
    buffer: Buffer,
    filename?: string,
  ): Promise<string> {
    const pending = this.getPending(phone);
    if (!pending) {
      return waSection(
        'CSV upload',
        'Pehle *Employee jodiyein* → *CSV se bulk add* chuno, phir file bhejein.',
      );
    }

    if (buffer.length > TEAM_CSV_MAX_BYTES) {
      return waSection(
        'File bahut badi',
        'CSV 2 MB se chhoti honi chahiye. Kam rows bhejein ya file compress karein.',
      );
    }

    const lowerName = (filename || '').toLowerCase();
    if (lowerName && !lowerName.endsWith('.csv') && !lowerName.endsWith('.txt')) {
      return waSection(
        'Galat file type',
        'Sirf *.csv* file bhejein (template se save karke).\n\nExcel? "Download as CSV" karein.',
      );
    }

    const parsed = parseTeamCsvText(buffer.toString('utf8'));
    if (!parsed.ok) {
      return waSection('CSV samajh nahi aayi', parsed.error);
    }

    if (parsed.rows.length > TEAM_CSV_MAX_ROWS) {
      return waSection(
        'Bahut zyada rows',
        `Ek baar mein maximum ${TEAM_CSV_MAX_ROWS} employees. Abhi ${parsed.rows.length} rows hain.`,
      );
    }

    this.pendingByPhone.delete(phone);

    const departments = await this.departmentsService.listByFactory(
      pending.businessId,
    );
    const deptOptions = departments.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
    }));

    if (!deptOptions.length) {
      return waSection(
        'Department chahiye',
        'Pehle kam se kam ek department set karein (business setup), phir CSV dubara bhejein.\n\n' +
          'Ya ek employee *WhatsApp par add* se jod kar department assign karein.',
      );
    }

    const results: BulkImportRowResult[] = [];
    for (const row of parsed.rows) {
      results.push(
        await this.importOneRow(pending.businessId, pending.ownerUserId, row, deptOptions),
      );
    }

    return this.formatSummary(results);
  }

  private async importOneRow(
    businessId: number,
    ownerUserId: number,
    row: TeamCsvRow,
    deptOptions: { id: number; name: string; slug: string }[],
  ): Promise<BulkImportRowResult> {
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

      const dept = resolveDepartmentSelection(row.department, deptOptions);
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
        return { ...base, name, status: 'added', detail: 'juda (pehle se account tha)' };
      }

      await this.workerOnboarding.onboardWorker({
        factoryId: businessId,
        name,
        phoneNumber: phone,
        departmentId: dept.id,
        doj,
      });

      return { ...base, name, status: 'added', detail: 'add ho gaya' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...base, status: 'failed', detail: msg.slice(0, 120) };
    }
  }

  private formatSummary(results: BulkImportRowResult[]): string {
    const added = results.filter((r) => r.status === 'added').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed');

    let body =
      `✅ *${added}* add hue\n` +
      (skipped ? `⏭️ *${skipped}* pehle se the\n` : '') +
      (failed.length ? `❌ *${failed.length}* fail\n` : '') +
      `\n`;

    if (failed.length) {
      const lines = failed.slice(0, 8).map(
        (r) => `• Line ${r.line} (${r.name}): ${r.detail}`,
      );
      body += lines.join('\n');
      if (failed.length > 8) {
        body += `\n• ...aur ${failed.length - 8} errors`;
      }
      body += '\n\n';
    }

    body +=
      'Naye employees ko WhatsApp par welcome message jayega.\n' +
      '*Home par jayein* se menu dubara khol sakte hain.';

    return waSection('CSV import complete', body);
  }
}
