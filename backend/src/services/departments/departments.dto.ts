import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
  @Type(() => Number)
  @IsNumber()
  factory_id!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  slug!: string;

  @Type(() => Number)
  @IsNumber()
  manager_user_id!: number;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  manager_user_id?: number;
}

export class AddDepartmentWorkerDto {
  @Type(() => Number)
  @IsNumber()
  user_id!: number;
}
