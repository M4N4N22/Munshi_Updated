import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

/** Nested line input for task creation (pattern: PurchaseRequestItemDto). */
export class TaskInventoryLineDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  inventory_item_id: number;

  @ApiProperty({ example: '5' })
  @IsString()
  quantity_expected: string;

  @ApiProperty({ example: 'STOCK_OUT' })
  @IsString()
  movement_type: string;
}
