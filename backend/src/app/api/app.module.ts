import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalApiAuthGuard } from 'src/core/guards/global-api-auth.guard';
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
import { BusinessDiscoveryModule } from 'src/services/business-discovery/business-discovery.module';
import { DocumentModule } from 'src/services/documents/documents.module';
import { OnboardingModule } from 'src/modules/onboarding/onboarding.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { TaskInventoryResolutionModule } from 'src/services/task-inventory-resolution/task-inventory-resolution.module';
import { AdminOpsModule } from 'src/modules/admin-ops/admin-ops.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    BusinessDiscoveryModule,
    OnboardingModule,
    DomainEventsModule,
    IntegrationModule,
    TaskInventoryResolutionModule,
    AdminOpsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GlobalApiAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ReqResInterceptor,
    },
  ],
})
export class AppModule {}
