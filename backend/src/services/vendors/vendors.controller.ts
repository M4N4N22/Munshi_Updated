import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateVendorDto,
  ListVendorsQueryDto,
  UpdateVendorDto,
  VendorDeactivateResponseDto,
  VendorFactoryQueryDto,
  VendorListResponseDto,
  VendorResponseDto,
} from './vendors.dto';
import { VendorService } from './vendors.service';

@ApiTags('vendors')
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  @ApiOperation({ summary: 'List vendors for a factory (paginated)' })
  @ApiResponse({ status: 200, type: VendorListResponseDto })
  list(@Query() query: ListVendorsQueryDto) {
    return this.vendorService.listVendors(query.factory_id, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      activeOnly: !query.include_inactive,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search vendors by name, phone, or GST' })
  @ApiQuery({ name: 'factory_id', required: true, type: Number })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: VendorListResponseDto })
  search(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    return this.vendorService.searchVendors(factoryId, q, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      activeOnly: !(includeInactive === 'true' || includeInactive === '1'),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by id (factory-scoped)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  getVendor(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: VendorFactoryQueryDto,
  ) {
    return this.vendorService.getVendor(id, query.factory_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a vendor' })
  @ApiResponse({ status: 201, type: VendorResponseDto })
  create(@Body() dto: CreateVendorDto) {
    return this.vendorService.createVendor(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vendor (factory-scoped)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: VendorFactoryQueryDto,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorService.updateVendor(id, query.factory_id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a vendor (soft delete)' })
  @ApiResponse({ status: 200, type: VendorDeactivateResponseDto })
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: VendorFactoryQueryDto,
  ) {
    return this.vendorService.deactivateVendor(id, query.factory_id);
  }
}
