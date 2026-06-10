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
import { extractWebhookDedupeKey } from './whatsapp-webhook-dedup.extract';
import { WhatsAppWebhookDedupService } from './whatsapp-webhook-dedup.service';

@Controller('webhook')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly webhookDedup: WhatsAppWebhookDedupService,
  ) {}

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

    const dedupeKey = extractWebhookDedupeKey(body);
    if (dedupeKey) {
      const data = body?.data as Record<string, unknown> | undefined;
      const msgType = String(data?.type ?? '').toLowerCase();
      const eventKind =
        msgType === 'text'
          ? 'text'
          : msgType === 'document' || msgType === 'file' || data?.document || data?.file
            ? 'document'
            : 'unknown';

      const shouldProcess = await this.webhookDedup.tryClaim({
        providerMessageId: dedupeKey,
        eventKind,
        fromPhone: typeof data?.from === 'string' ? data.from : undefined,
      });
      if (!shouldProcess) {
        return 'ok';
      }
    }

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
