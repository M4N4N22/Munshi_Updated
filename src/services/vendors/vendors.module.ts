import { Module } from '@nestjs/common';
import { VendorController } from './vendors.controller';
import { VendorRepository } from './vendors.repository';
import { VendorService } from './vendors.service';

@Module({
  controllers: [VendorController],
  providers: [VendorService, VendorRepository],
  exports: [VendorService, VendorRepository],
})
export class VendorModule {}
