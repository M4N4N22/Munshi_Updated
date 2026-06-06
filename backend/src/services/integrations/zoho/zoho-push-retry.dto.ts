import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class ZohoPushDeliveriesQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  factory_id!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  user_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  connection_id?: number;
}
