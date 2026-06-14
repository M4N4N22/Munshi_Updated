import { Test } from '@nestjs/testing';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookDedupService } from './whatsapp-webhook-dedup.service';

describe('WhatsAppController webhook dedup', () => {
  let controller: WhatsAppController;
  const handleIncomingMessage = jest.fn().mockResolvedValue('ok');
  const handleIncomingDocument = jest.fn().mockResolvedValue('ok');
  const tryClaim = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    tryClaim.mockResolvedValue(true);

    const moduleRef = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: { handleIncomingMessage, handleIncomingDocument },
        },
        {
          provide: WhatsAppWebhookDedupService,
          useValue: { tryClaim },
        },
      ],
    }).compile();

    controller = moduleRef.get(WhatsAppController);
  });

  it('skips duplicate webhook payload', async () => {
    tryClaim.mockResolvedValue(false);
    const body = {
      event: 'message',
      data: {
        type: 'text',
        from: '91999',
        message_id: 'wamid.dup',
        text: 'CONFIRM',
      },
    };

    const result = await controller.receiveMessage(body);

    expect(result).toBe('ok');
    expect(handleIncomingMessage).not.toHaveBeenCalled();
  });

  it('processes first webhook payload', async () => {
    const body = {
      event: 'message',
      data: {
        type: 'text',
        from: '91999',
        message_id: 'wamid.first',
        text: 'CONFIRM',
      },
    };

    await controller.receiveMessage(body);

    expect(tryClaim).toHaveBeenCalledWith(
      expect.objectContaining({ providerMessageId: 'wamid.first' }),
    );
    expect(handleIncomingMessage).toHaveBeenCalled();
  });
});
