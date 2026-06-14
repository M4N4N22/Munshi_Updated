import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/core/guards/public.decorator';
import { INVENTORY_CSV_MAX_BYTES } from 'src/modules/whatsapp/inventory-csv.constants';
import { InventoryCsvUploadFile } from 'src/services/inventory/inventory-import-upload.service';
import { OnboardingService } from './onboarding.service';
import { OnboardingSetupService } from './onboarding-setup.service';
import {
  OnboardingSetupCompleteDto,
  OnboardingSetupTokenDto,
} from './onboarding-setup.dto';
import {
  RegisterOnboardingDto,
  SendOtpDto,
  VerifyOtpDto,
} from './onboarding.dto';

@ApiTags('Onboarding')
@Public()
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly onboardingSetup: OnboardingSetupService,
  ) {}

  @Get('config')
  getConfig() {
    return this.onboardingService.getConfig();
  }

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

  @Get('setup/status')
  getSetupStatus(@Query('setup_token') setupToken: string) {
    return this.onboardingSetup.getStatus(setupToken);
  }

  @Post('setup/inventory/skip')
  skipInventory(@Body() dto: OnboardingSetupTokenDto) {
    return this.onboardingSetup.skipInventory(dto.setup_token);
  }

  @Post('setup/inventory/zoho-complete')
  markInventoryZoho(@Body() dto: OnboardingSetupTokenDto) {
    return this.onboardingSetup.markInventoryFromZoho(dto.setup_token);
  }

  @Post('setup/team/skip')
  skipTeam(@Body() dto: OnboardingSetupTokenDto) {
    return this.onboardingSetup.skipTeam(dto.setup_token);
  }

  @Post('setup/complete')
  completeSetup(@Body() dto: OnboardingSetupCompleteDto) {
    return this.onboardingSetup.complete(dto.setup_token, {
      notify_employees: dto.notify_employees,
    });
  }

  @Post('setup/inventory/preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: INVENTORY_CSV_MAX_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'setup_token'],
      properties: {
        file: { type: 'string', format: 'binary' },
        setup_token: { type: 'string' },
      },
    },
  })
  previewInventory(
    @UploadedFile() file: InventoryCsvUploadFile,
    @Body('setup_token') setupToken: string,
  ) {
    return this.onboardingSetup.previewInventory(setupToken, file);
  }

  @Post('setup/inventory/import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: INVENTORY_CSV_MAX_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'setup_token'],
      properties: {
        file: { type: 'string', format: 'binary' },
        setup_token: { type: 'string' },
      },
    },
  })
  importInventory(
    @UploadedFile() file: InventoryCsvUploadFile,
    @Body('setup_token') setupToken: string,
  ) {
    return this.onboardingSetup.importInventory(setupToken, file);
  }

  @Post('setup/team/preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: INVENTORY_CSV_MAX_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'setup_token'],
      properties: {
        file: { type: 'string', format: 'binary' },
        setup_token: { type: 'string' },
      },
    },
  })
  previewTeam(
    @UploadedFile() file: InventoryCsvUploadFile,
    @Body('setup_token') setupToken: string,
  ) {
    return this.onboardingSetup.previewTeam(setupToken, file);
  }

  @Post('setup/team/import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: INVENTORY_CSV_MAX_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'setup_token'],
      properties: {
        file: { type: 'string', format: 'binary' },
        setup_token: { type: 'string' },
      },
    },
  })
  importTeam(
    @UploadedFile() file: InventoryCsvUploadFile,
    @Body('setup_token') setupToken: string,
  ) {
    return this.onboardingSetup.importTeam(setupToken, file);
  }
}
