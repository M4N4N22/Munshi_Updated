import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NOT_IMPLEMENTED_RESPONSE } from 'src/core/constants/not-implemented.constants';
import { CreateVendorDto, UpdateVendorDto } from './vendors.dto';
import { VendorRepository } from './vendors.repository';

@Injectable()
export class VendorService {
  constructor(private readonly vendorRepository: VendorRepository) {}

  list(_factoryId?: number) {
    void this.vendorRepository;
    return NOT_IMPLEMENTED_RESPONSE;
  }

  findOne(_id: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  create(_dto: CreateVendorDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  update(_id: number, _dto: UpdateVendorDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  remove(_id: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }
}

@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  list(@Query('factory_id') factoryId?: string) {
    return this.vendorService.list(
      factoryId ? Number(factoryId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendorService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorService.remove(id);
  }
}
