import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalCallGuard } from 'src/core/guards/guards';
import { Public } from 'src/core/guards/public.decorator';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIncomingDto } from './whatsapp.dto';
import { parseWhatsAppInbound } from './whatsapp-inbound.parser';

@Controller('webhook')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  // 🔐 Verification (Meta requirement)
  @Public()
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }

    return 'Verification failed';
  }

  // 📩 Incoming messages
  @Public()
  @Post()
  async receiveMessage(@Body() body: any) {
    console.log({ controller_body: body });

    const inbound = parseWhatsAppInbound(body);
    if (!inbound) {
      return 'ok';
    }

    if (inbound.kind === 'document') {
      return await this.whatsappService.handleIncomingDocument(
        inbound.from,
        inbound.media,
      );
    }

    return await this.whatsappService.handleIncomingMessage({
      from: inbound.from,
      message: inbound.message,
    });
  }

  /** Dev/staging injection — requires x-secret when ENABLE_WEBHOOK_TEST_ROUTE=true (FI-P04). */
  @UseGuards(InternalCallGuard)
  @Post('test')
  async handleMessage(@Body() body: WhatsAppIncomingDto) {
    if (process.env.ENABLE_WEBHOOK_TEST_ROUTE !== 'true') {
      throw new NotFoundException();
    }
    return this.whatsappService.handleIncomingMessage(body);
  }
}
