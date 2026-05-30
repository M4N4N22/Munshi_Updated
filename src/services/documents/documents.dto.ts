import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { DOCUMENT_TYPE } from './documents.constants';

export class DocumentFactoryQueryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;
}

export class CreateDocumentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsNumber()
  uploaded_by?: number;

  @ApiPropertyOptional({ example: DOCUMENT_TYPE.INVENTORY_IMPORT })
  @IsOptional()
  @IsString()
  document_type?: string;

  @ApiPropertyOptional({ example: 'inventory-sheet.xlsx' })
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiPropertyOptional({ example: 's3://bucket/key' })
  @IsOptional()
  @IsString()
  storage_ref?: string;

  @ApiPropertyOptional({ example: 'application/vnd.ms-excel' })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class StoreExtractionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiPropertyOptional({ example: DOCUMENT_TYPE.INVENTORY_IMPORT })
  @IsOptional()
  @IsString()
  document_type_detected?: string;

  @ApiPropertyOptional({ example: 'v1' })
  @IsOptional()
  @IsString()
  extraction_version?: string;

  @ApiProperty({
    example: {
      document_type: 'INVENTORY_IMPORT',
      items: [{ name: 'Cement', quantity: 500 }],
    },
  })
  @IsObject()
  payload: Record<string, unknown>;
}

export class StartSuggestionApprovalDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: '919876543210' })
  @IsString()
  phone_number: string;
}

export class RejectSuggestionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiPropertyOptional({ example: 'Not my inventory' })
  @IsOptional()
  @IsString()
  reason?: string;
}
