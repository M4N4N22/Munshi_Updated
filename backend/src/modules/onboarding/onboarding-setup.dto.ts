import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OnboardingSetupTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  setup_token: string;
}

export class OnboardingSetupCompleteDto extends OnboardingSetupTokenDto {
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  notify_employees?: boolean;
}
