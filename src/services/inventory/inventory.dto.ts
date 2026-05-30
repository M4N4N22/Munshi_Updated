import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateInventoryCategoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 'Raw Materials' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateInventoryCategoryDto {
  @ApiPropertyOptional({ example: 'Raw Materials' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateInventoryLocationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 'Warehouse A' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'WH-A' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Location description / address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateInventoryLocationDto {
  @ApiPropertyOptional({ example: 'Warehouse A' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateInventoryItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  category_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  location_id: number;

  @ApiProperty({ example: 'CEM001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Cement' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bags' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: '50' })
  @IsOptional()
  @IsString()
  reorder_threshold?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  category_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  location_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reorder_threshold?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class RecordInventoryTransactionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  inventory_item_id: number;

  @ApiProperty({ example: '10' })
  @IsString()
  quantity: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reference_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  created_by?: number;
}
