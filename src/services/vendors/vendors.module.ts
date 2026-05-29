import { Module } from '@nestjs/common';
import { VendorController, VendorService } from './vendors.service';
import { VendorRepository } from './vendors.repository';

@Module({
  controllers: [VendorController],
  providers: [VendorService, VendorRepository],
  exports: [VendorService, VendorRepository],
})
export class VendorModule {}
