import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class BusinessDiscoveryFactoryQueryDto {
  @ApiProperty({ example: 3 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  factory_id: number;
}

export class BusinessDiscoveryRecordFieldDto {
  @ApiProperty({ example: 'BUSINESS_IDENTITY' })
  @IsString()
  bucket: string;

  @ApiProperty({ example: 'industry' })
  @IsString()
  field: string;

  @ApiPropertyOptional()
  @IsOptional()
  value?: string;
}

export class BusinessDiscoveryProgressResponseDto {
  @ApiProperty()
  factory_id: number;

  @ApiProperty()
  readiness: {
    identity: number;
    organization: number;
    inventory: number;
    vendors: number;
    overall: number;
    status: string;
  };
}
