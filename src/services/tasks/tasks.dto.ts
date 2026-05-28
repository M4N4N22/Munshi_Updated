import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: 2, description: 'User id of the assignee' })
  @IsNumber()
  assigned_to: number;

  @ApiProperty({ example: 1, description: 'User id of the assigner' })
  @IsNumber()
  assigned_by: number;

  @ApiProperty({ example: 'Clean warehouse' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: '2026-05-20T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  deadline?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-05-20T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  assigned_to?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;
}

export class AddTaskUpdateDto {
  @ApiProperty({ example: 'Work in progress' })
  @IsString()
  message: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  user_id: number;
}
