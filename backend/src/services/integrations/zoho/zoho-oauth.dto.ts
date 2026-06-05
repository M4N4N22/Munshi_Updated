import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class IntegrationFactoryUserQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  factory_id!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  user_id!: number;
}

export class ZohoDisconnectDto extends IntegrationFactoryUserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  connection_id?: number;

  @IsOptional()
  @IsString()
  provider?: string;
}
