import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DbModule } from 'src/core/services/db-service/db.module';
import { HealthCheckModule } from 'src/core/health-check/health.module';
import { MigrationHealthModule } from 'src/core/migrations/migration-health.module';
import { ReqResInterceptor } from 'src/core/interceptors/response-interceptor';
import { LoggerModule } from 'src/core/services/logger/logger.module';
import { HttpExceptionFilter } from 'src/core/filters/http-exception.filter';
import { UserModule } from 'src/services/users/users.module';
import { FactoryModule } from 'src/services/factories/factories.module';
import { WhatsAppModule } from 'src/modules/whatsapp/whatsapp.module';
import { IssueModule } from 'src/services/issues/issues.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsModule } from 'src/services/reports/reports.module';
import { VendorModule } from 'src/services/vendors/vendors.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { PurchaseRequestModule } from 'src/services/purchase-requests/purchase-requests.module';
import { ApprovalModule } from 'src/services/approvals/approvals.module';
import { DocumentModule } from 'src/services/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DbModule,
    LoggerModule,
    HealthCheckModule,
    MigrationHealthModule,
    // modules
    //
    WhatsAppModule,
    UserModule,
    FactoryModule,
    IssueModule,
    ReportsModule,
    TasksModule,
    DepartmentsModule,
    VendorModule,
    InventoryModule,
    PurchaseRequestModule,
    ApprovalModule,
    DocumentModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
