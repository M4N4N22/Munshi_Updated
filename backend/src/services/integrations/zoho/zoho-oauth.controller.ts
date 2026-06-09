import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/core/guards/public.decorator';
import { Response } from 'express';
import { ZohoOAuthService } from './zoho-oauth.service';
import {
  IntegrationFactoryUserQueryDto,
  ZohoDisconnectDto,
} from './zoho-oauth.dto';

@ApiTags('integrations')
@Controller('integrations')
export class ZohoOAuthController {
  constructor(private readonly zohoOAuthService: ZohoOAuthService) {}

  @Public()
  @Get('zoho/authorize')
  @ApiOperation({ summary: 'Start Zoho OAuth (owner/manager only)' })
  async authorize(
    @Query() query: IntegrationFactoryUserQueryDto,
    @Res() res: Response,
  ) {
    const url = await this.zohoOAuthService.buildAuthorizeRedirectUrl(
      query.factory_id,
      query.user_id,
    );
    return res.redirect(url);
  }

  @Public()
  @Get('zoho/callback')
  @ApiOperation({ summary: 'Zoho OAuth callback — validates state and stores tokens' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.zohoOAuthService.handleOAuthCallback(
      code,
      state,
      error,
    );
    return res.redirect(redirectUrl);
  }

  @Post('zoho/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect Zoho integration (soft disconnect)' })
  disconnect(@Body() dto: ZohoDisconnectDto) {
    return this.zohoOAuthService.disconnect(dto.factory_id, dto.user_id, {
      connectionId: dto.connection_id,
      provider: dto.provider,
    });
  }

  @Get('connections')
  @ApiOperation({ summary: 'List integration connections for a factory' })
  listConnections(@Query() query: IntegrationFactoryUserQueryDto) {
    return this.zohoOAuthService.listConnections(
      query.factory_id,
      query.user_id,
    );
  }
}
