import { Module } from '@nestjs/common';
import { ApprovalController, ApprovalService } from './approvals.service';
import { ApprovalRepository } from './approvals.repository';

@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalRepository],
  exports: [ApprovalService, ApprovalRepository],
})
export class ApprovalModule {}
