import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  PURCHASE_REQUEST_PRIORITY,
  PURCHASE_REQUEST_STATUS,
} from './purchase-requests.constants';

export class PurchaseRequestFactoryQueryDto {
  @ApiProperty({ example: 3 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  factory_id: number;
}

export class ListPurchaseRequestsQueryDto extends PurchaseRequestFactoryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 25 })
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ enum: PURCHASE_REQUEST_STATUS })
  @IsOptional()
  @IsEnum(PURCHASE_REQUEST_STATUS)
  status?: string;
}

export class PurchaseRequestItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  inventory_item_id?: number;

  @ApiProperty({ example: 'Cement 50kg bags' })
  @IsString()
  item_name: string;

  @ApiProperty({ example: '100' })
  @IsString()
  requested_quantity: string;

  @ApiPropertyOptional({ example: 'bags' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  requested_by: number;

  @ApiProperty({ example: 'Restock cement bags' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PURCHASE_REQUEST_PRIORITY })
  @IsOptional()
  @IsEnum(PURCHASE_REQUEST_PRIORITY)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [PurchaseRequestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items?: PurchaseRequestItemDto[];

  @ApiPropertyOptional({
    description: 'When true, moves status to PENDING_APPROVAL immediately',
  })
  @IsOptional()
  submit?: boolean;
}

export class UpdatePurchaseRequestDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  performed_by: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PURCHASE_REQUEST_PRIORITY })
  @IsOptional()
  @IsEnum(PURCHASE_REQUEST_PRIORITY)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [PurchaseRequestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items?: PurchaseRequestItemDto[];
}

export class PurchaseRequestActionDto extends PurchaseRequestFactoryQueryDto {
  @ApiProperty({ example: 18 })
  @IsNumber()
  performed_by: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class AssignVendorDto extends PurchaseRequestActionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  vendor_id: number;
}

export class CreateFromSuggestionDto extends PurchaseRequestFactoryQueryDto {
  @ApiProperty({ example: 18 })
  @IsNumber()
  requested_by: number;

  @ApiProperty({ example: 'low-stock:3:1' })
  @IsString()
  suggestion_key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class PurchaseRequestItemResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() purchase_request_id: number;
  @ApiPropertyOptional() inventory_item_id: number | null;
  @ApiProperty() item_name: string;
  @ApiProperty() requested_quantity: string;
  @ApiProperty() unit: string;
  @ApiPropertyOptional() notes: string | null;
}

export class PurchaseRequestResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() factory_id: number;
  @ApiPropertyOptional() request_number: string | null;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() status: string;
  @ApiProperty() requested_by: number;
  @ApiPropertyOptional() approved_by: number | null;
  @ApiPropertyOptional() assigned_vendor_id: number | null;
  @ApiProperty() priority: string;
  @ApiPropertyOptional() requested_at: Date | null;
  @ApiPropertyOptional() approved_at: Date | null;
  @ApiPropertyOptional() closed_at: Date | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiPropertyOptional({ type: [PurchaseRequestItemResponseDto] })
  items?: PurchaseRequestItemResponseDto[];
}

export class PurchaseRequestListResponseDto {
  @ApiProperty({ type: [PurchaseRequestResponseDto] })
  data: PurchaseRequestResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

export class PurchaseRequestAuditResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() purchase_request_id: number;
  @ApiProperty() event_type: string;
  @ApiPropertyOptional() performed_by: number | null;
  @ApiProperty() metadata: Record<string, unknown>;
  @ApiProperty() created_at: Date;
}

export class PurchaseRequestSuggestionResponseDto {
  @ApiProperty() suggestion_key: string;
  @ApiProperty() inventory_item_id: number;
  @ApiProperty() item_name: string;
  @ApiProperty() sku: string;
  @ApiProperty() current_quantity: string;
  @ApiPropertyOptional() reorder_threshold: string | null;
  @ApiProperty() suggested_quantity: string;
  @ApiProperty() unit: string;
  @ApiProperty() reason: string;
}
