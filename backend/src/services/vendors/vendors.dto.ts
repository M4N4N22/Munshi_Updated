import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VENDOR_FIELD_LIMITS } from './vendors.constants';

export class CreateVendorDto {
  @ApiProperty({ example: 1, description: 'Factory this vendor belongs to' })
  @Type(() => Number)
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 'Acme Supplies Pvt Ltd' })
  @IsString()
  @IsNotEmpty({ message: 'Vendor name is required' })
  @MaxLength(VENDOR_FIELD_LIMITS.NAME_MAX)
  name: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Primary communication identity (required)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vendor phone number is required' })
  @MinLength(10)
  @MaxLength(VENDOR_FIELD_LIMITS.PHONE_MAX)
  phone_number: string;

  @ApiPropertyOptional({ example: 'vendor@acme.example' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(VENDOR_FIELD_LIMITS.EMAIL_MAX)
  email?: string;

  @ApiPropertyOptional({ example: '123 Industrial Area, Pune' })
  @IsOptional()
  @IsString()
  @MaxLength(VENDOR_FIELD_LIMITS.ADDRESS_MAX)
  address?: string;

  @ApiPropertyOptional({
    example: '27AABCU9603R1ZM',
    description: '15-character Indian GSTIN (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(VENDOR_FIELD_LIMITS.GST_MAX)
  gst_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(VENDOR_FIELD_LIMITS.NOTES_MAX)
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Acme Supplies Pvt Ltd' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Vendor name cannot be empty' })
  @MaxLength(VENDOR_FIELD_LIMITS.NAME_MAX)
  name?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Vendor phone number cannot be empty' })
  @MaxLength(VENDOR_FIELD_LIMITS.PHONE_MAX)
  phone_number?: string;

  @ApiPropertyOptional({ example: 'vendor@acme.example' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(VENDOR_FIELD_LIMITS.EMAIL_MAX)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(VENDOR_FIELD_LIMITS.ADDRESS_MAX)
  address?: string;

  @ApiPropertyOptional({ example: '27AABCU9603R1ZM' })
  @IsOptional()
  @IsString()
  @MaxLength(VENDOR_FIELD_LIMITS.GST_MAX)
  gst_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(VENDOR_FIELD_LIMITS.NOTES_MAX)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListVendorsQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  factory_id: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 25, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    example: 'acme',
    description: 'Search by name, phone, or GST (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'When true, include inactive vendors in list',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  include_inactive?: boolean;
}

export class VendorFactoryQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  factory_id: number;
}

export class VendorResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  factory_id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone_number: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  gst_number?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  is_active: boolean;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class VendorListResponseDto {
  @ApiProperty({ type: [VendorResponseDto] })
  data: VendorResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class VendorDeactivateResponseDto {
  @ApiProperty({ example: 'Vendor deactivated successfully' })
  message: string;

  @ApiProperty({ type: VendorResponseDto })
  data: VendorResponseDto;
}
