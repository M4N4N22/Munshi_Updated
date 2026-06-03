import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIssueDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  reported_by: number;

  @ApiProperty({ example: 'Machine not working' })
  @IsString()
  message: string;
}

export class UpdateIssueDto {
  @ApiPropertyOptional({ example: 'Machine not working — needs servicing' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_resolved?: boolean;
}
