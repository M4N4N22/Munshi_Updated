import { Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common';
import { Public } from 'src/core/guards/public.decorator';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIncomingDto } from './whatsapp.dto';
import { parseWhatsAppInbound } from './whatsapp-inbound.parser';

@Public()
@Controller('webhook')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  // 🔐 Verification (Meta requirement)
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

  @Post('test')
  async handleMessage(@Body() body: WhatsAppIncomingDto) {
    if (process.env.ENABLE_WEBHOOK_TEST_ROUTE !== 'true') {
      throw new NotFoundException();
    }
    return this.whatsappService.handleIncomingMessage(body);
  }
}
