import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';

export interface IMigrationStatusSummary {
  up_to_date: boolean;
  total_files: number;
  applied_count: number;
  pending_count: number;
  latest_file: string | null;
  latest_applied: string | null;
  pending: string[];
  applied: string[];
}

@Injectable()
export class MigrationHealthService {
  private readonly logger = new Logger(MigrationHealthService.name);

  private scriptPath(name: string): string {
    return join(process.cwd(), 'scripts', name);
  }

  private runScript(scriptName: string): string {
    const script = this.scriptPath(scriptName);
    if (!existsSync(script)) {
      throw new Error(`Migration script not found: ${script}`);
    }

    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
    });

    if (result.error) {
      throw result.error;
    }

    const output = result.stdout?.trim();
    if (!output) {
      throw new Error(
        result.stderr?.trim() || `Migration script produced no output: ${scriptName}`,
      );
    }

    return output;
  }

  async getStatus(): Promise<IMigrationStatusSummary> {
    try {
      const raw = this.runScript('migration-status.mjs');
      const status = JSON.parse(raw);
      return {
        up_to_date: status.up_to_date,
        total_files: status.total_files,
        applied_count: status.applied_count,
        pending_count: status.pending_count,
        latest_file: status.latest_file,
        latest_applied: status.latest_applied,
        pending: status.pending,
        applied: status.applied,
      };
    } catch (error) {
      this.logger.error('Failed to read migration status', error);
      throw error;
    }
  }
}
