import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import {
  RegisterOnboardingDto,
  SendOtpDto,
  VerifyOtpDto,
} from './onboarding.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.onboardingService.sendOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.onboardingService.verifyOtp(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterOnboardingDto) {
    return this.onboardingService.register(dto);
  }
}
