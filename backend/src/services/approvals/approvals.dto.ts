import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateApprovalRequestDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 'PURCHASE_REQUEST' })
  @IsString()
  entity_type: string;

  @ApiProperty({ example: 42 })
  @IsNumber()
  entity_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  requester_id: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  approver_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateApprovalRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  approver_id?: number;

  @ApiPropertyOptional({ example: 'APPROVED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
