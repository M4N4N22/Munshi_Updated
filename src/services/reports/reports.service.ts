import {
  Controller,
  Get,
  Injectable,
  Query,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Attendance } from '../attendance/attendance.schema';
import { Task } from '../tasks/tasks.schema';
import { Issue } from '../issues/issues.schema';
import { FactoryUser } from '../factories/factories.schema';
import { USER_ROLE } from '../users/users.constants';
import { WA_DIVIDER } from 'src/modules/whatsapp/whatsapp.templates';
import { getTodayCalendarDateIST } from 'src/core/time/india-defaults';

export interface FactoryReport {
  date: string;
  factory_id: number;
  attendance: { total: number; present: number; absent: number };
  tasks: { total: number; completed: number; pending: number };
  issues: { open: number; resolved: number };
}

@Injectable()
export class ReportService {
  private attendanceModel: typeof Attendance;
  private taskModel: typeof Task;
  private issueModel: typeof Issue;
  private factoryUserModel: typeof FactoryUser;

  constructor(private readonly dbService: DbService) {
    this.attendanceModel = this.dbService.sqlService.Attendance;
    this.taskModel = this.dbService.sqlService.Task;
    this.issueModel = this.dbService.sqlService.Issue;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  async generateReport(factoryId: number, date?: string) {
    const data = await this.getReport(factoryId, date);
    return this.formatReport(data);
  }

  async getReport(factoryId: number, date?: string): Promise<FactoryReport> {
    const reportDate = date || getTodayCalendarDateIST();

    const totalWorkers = await this.factoryUserModel.count({
      where: { factory_id: factoryId, role: USER_ROLE.WORKER },
    });

    const presentCount = await this.attendanceModel.count({
      where: {
        factory_id: factoryId,
        date: reportDate,
        is_present: true,
      },
    });

    const absentCount = Math.max(0, totalWorkers - presentCount);

    const totalTasks = await this.taskModel.count({
      where: { factory_id: factoryId },
    });

    const completedTasks = await this.taskModel.count({
      where: { factory_id: factoryId, is_completed: true },
    });

    const pendingTasks = Math.max(0, totalTasks - completedTasks);

    const openIssues = await this.issueModel.count({
      where: { factory_id: factoryId, is_resolved: false },
    });

    const resolvedIssues = await this.issueModel.count({
      where: { factory_id: factoryId, is_resolved: true },
    });

    return {
      date: reportDate,
      factory_id: factoryId,
      attendance: {
        total: totalWorkers,
        present: presentCount,
        absent: absentCount,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
      },
      issues: { open: openIssues, resolved: resolvedIssues },
    };
  }

  private formatReport(r: FactoryReport) {
    return (
      `${WA_DIVIDER}\n*Factory report*\n${WA_DIVIDER}\n\n` +
      `📅 *Date:* ${r.date}\n\n` +
      `👷 *Attendance*\n` +
      `• Total workers: ${r.attendance.total}\n` +
      `• Present: ${r.attendance.present}\n` +
      `• Absent: ${r.attendance.absent}\n\n` +
      `📋 *Tasks*\n` +
      `• Total: ${r.tasks.total}\n` +
      `• Completed: ${r.tasks.completed}\n` +
      `• Pending: ${r.tasks.pending}\n\n` +
      `🚨 *Issues*\n` +
      `• Open: ${r.issues.open}\n` +
      `• Resolved: ${r.issues.resolved}\n\n` +
      `${WA_DIVIDER}`
    );
  }
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportService) {}

  @Get()
  get(@Query('factory_id') factory_id: string, @Query('date') date?: string) {
    return this.reportsService.getReport(Number(factory_id), date);
  }
}
