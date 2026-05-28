import {
  IsString,
  IsOptional,
  IsNumberString,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ROLE } from '../users/users.constants';

// -------- Factory DTO --------
export class CreateFactoryDto {
  @ApiProperty({
    example: 'ABC Textiles Pvt Ltd',
    description: 'Name of the factory',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Industrial Area Phase 2, Ludhiana, Punjab',
    description: 'Factory address',
  })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateFactoryDto {
  @ApiPropertyOptional({ example: 'ABC Textiles Pvt Ltd' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Industrial Area Phase 2, Ludhiana, Punjab' })
  @IsOptional()
  @IsString()
  address?: string;
}

/** Assign an existing user (user_id) OR create a new user (phone_number) and link to the factory. */
export class AssignFactoryMemberDto {
  @ApiProperty({ example: '1' })
  @IsNumberString()
  factory_id: string;

  @ApiProperty({
    example: USER_ROLE.WORKER,
    description: 'Role of the user in the factory',
    enum: USER_ROLE,
  })
  @IsEnum(USER_ROLE)
  role: USER_ROLE;

  @ApiPropertyOptional({
    example: '12',
    description: 'Existing user id (omit when creating a new user)',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || String(value).trim() === ''
      ? undefined
      : String(value).trim(),
  )
  @IsNumberString()
  user_id?: string;

  @ApiPropertyOptional({
    example: '919876543210',
    description: 'Phone for a new user (omit when assigning an existing user)',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || String(value).trim() === ''
      ? undefined
      : String(value).trim(),
  )
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || String(value).trim() === ''
      ? undefined
      : String(value).trim(),
  )
  @IsString()
  name?: string;
}

export class UpdateFactoryUserDto {
  @ApiPropertyOptional({ enum: USER_ROLE })
  @IsOptional()
  @IsEnum(USER_ROLE)
  role?: USER_ROLE;
}
