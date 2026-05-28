import { Module } from '@nestjs/common';
import { ReportService, ReportsController } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportsModule {}
