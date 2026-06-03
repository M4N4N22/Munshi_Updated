import { Module } from '@nestjs/common';
import { FactoryController, FactoryService } from './factories.service';
import { MessagingModule } from 'src/core/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [FactoryController],
  providers: [FactoryService],
  exports: [FactoryService],
})
export class FactoryModule {}
