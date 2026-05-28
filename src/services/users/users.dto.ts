import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: '919876543210',
    description: 'User phone number in international format',
  })
  @IsString()
  phone_number: string;

  @ApiPropertyOptional({
    example: 'Anmol',
    description: 'Full name of the user',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'URL of the user profile picture',
  })
  @IsOptional()
  @IsString()
  profile_picture?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '919876543210' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'Anand Kumar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  profile_picture?: string;
}

