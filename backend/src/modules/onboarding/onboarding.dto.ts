import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

const PHONE_PATTERN = /^91\d{10}$/;

export class SendOtpDto {
  @ApiProperty({ example: '919876543210' })
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone_number must be 91 followed by 10 digits (no +)',
  })
  phone_number: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '919876543210' })
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone_number must be 91 followed by 10 digits (no +)',
  })
  phone_number: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}

export class RegisterOnboardingDto {
  @ApiProperty({ example: '919876543210' })
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone_number must be 91 followed by 10 digits (no +)',
  })
  phone_number: string;

  @ApiProperty({ example: 'Anmol Sharma' })
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiProperty({ example: 'ABC Textiles' })
  @IsString()
  @IsNotEmpty({ message: 'factory_name is required' })
  factory_name: string;
}
