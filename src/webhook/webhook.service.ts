import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const BITRIX_WEBHOOK =
  'https://wra-usa.bitrix24.com/rest/1891/iujlx5djbvetyyej/';

interface WebhookDto {
  userId: string;
  message: string;
  name: string;
  email: string;
  phone: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private userSessions = new Map<
    string,
    { contactId: number; dealId: number }
  >();

  async processWebhook(data: WebhookDto) {
    const { userId, name, email, phone, message } = data;

    if (!this.userSessions.has(userId)) {
      try {
        const contactRes = await axios.post(
          `${BITRIX_WEBHOOK}/crm.contact.add.json`,
          {
            fields: {
              NAME: name,
              EMAIL: [{ VALUE: email, VALUE_TYPE: 'WORK' }],
              PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
            },
          },
        );

        const contactId = contactRes.data.result;

        const dealRes = await axios.post(
          `${BITRIX_WEBHOOK}/crm.deal.add.json`,
          {
            fields: {
              TITLE: `Lead GPT - ${name}`,
              CONTACT_ID: contactId,
              CATEGORY_ID: 9,
              STAGE_ID: 'NEW',
              SOURCE_ID: 'WEB',
            },
          },
        );

        const dealId = dealRes.data.result;

        this.userSessions.set(userId, { contactId, dealId });
        this.logger.log(`Contato e negócio criados: ${dealId}`);
      } catch (error) {
        this.logger.error('Erro criando contato ou negócio', error);
        throw new Error('Erro na integração com Bitrix24');
      }
    }

    const { dealId } = this.userSessions.get(userId)!;

    try {
      await axios.post(`${BITRIX_WEBHOOK}/crm.timeline.comment.add.json`, {
        fields: {
          ENTITY_ID: dealId,
          ENTITY_TYPE: 'deal',
          COMMENT: message,
        },
      });
    } catch (error) {
      this.logger.error('Erro ao adicionar comentário', error);
      throw new Error('Erro ao registrar comentário');
    }
  }
}
