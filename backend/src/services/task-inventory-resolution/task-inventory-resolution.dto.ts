import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TASK_KINDS } from '../../../contracts/typescript/index';

export class TaskInventoryExtractionDto {
  @ApiPropertyOptional({ example: 'cement', nullable: true })
  @IsOptional()
  @IsString()
  item_name_or_sku: string | null;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  @IsNumber()
  quantity: number | null;

  @ApiPropertyOptional({ example: 'Ram', nullable: true })
  @IsOptional()
  @IsString()
  assignee_hint: string | null;

  @ApiPropertyOptional({
    example: 'delivery',
    enum: [...TASK_KINDS, null],
    nullable: true,
  })
  @IsOptional()
  @IsIn([...TASK_KINDS, null])
  task_kind: (typeof TASK_KINDS)[number] | null;
}

export class ResolveTaskInventoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ type: TaskInventoryExtractionDto })
  @ValidateNested()
  @Type(() => TaskInventoryExtractionDto)
  extraction: TaskInventoryExtractionDto;
}
