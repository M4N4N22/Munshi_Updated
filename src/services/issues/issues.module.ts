import { Module } from '@nestjs/common';
import { IssueController, IssueService } from './issues.service';
import { MessagingModule } from 'src/core/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [IssueController],
  providers: [IssueService],
  exports: [IssueService],
})
export class IssueModule {}
