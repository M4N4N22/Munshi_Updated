import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIncomingDto } from './whatsapp.dto';

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

    const data = body?.data;

    if (!data) {
      return 'No message data';
    }

    if (data.type !== 'text') {
      return 'Unsupported message type';
    }

    const from = data.from;

    const text = data.text;

    if (!from || !text) {
      return 'Invalid message payload';
    }

    return await this.whatsappService.handleIncomingMessage({
      from,
      message: text,
    });
  }

  @Post('test')
  async handleMessage(
    @Body() body: WhatsAppIncomingDto,
    @Query('dry') dry?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (dry === '1') {
      const result = await this.whatsappService.handleIncomingMessage(body, {
        dryRun: true,
      });
      res?.status(200);
      return result;
    }
    return this.whatsappService.handleIncomingMessage(body);
  }
}
