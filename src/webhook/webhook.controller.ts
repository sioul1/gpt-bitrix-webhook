import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

class WebhookDto {
  userId: string;
  message: string;
  name: string;
  email: string;
  phone: string;
}

@Controller('gptmaker-webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async handleWebhook(@Body() data: WebhookDto) {
    try {
      await this.webhookService.processWebhook(data);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Erro ao processar webhook', error);
      return { status: 'erro', detalhe: error.message };
    }
  }
}
