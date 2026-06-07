import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { TaskInventoryExtractionContract } from '../../../contracts/typescript/index';

@Injectable()
export class MlTaskInventoryClient {
  private readonly logger = new Logger(MlTaskInventoryClient.name);
  private readonly baseUrl = process.env.ML_URL ?? 'http://localhost:8000';

  async extract(message: string): Promise<TaskInventoryExtractionContract | null> {
    const trimmed = message.trim();
    if (!trimmed) return null;

    try {
      const response = await axios.post<TaskInventoryExtractionContract>(
        `${this.baseUrl}/extract/task-inventory`,
        null,
        { params: { message: trimmed }, timeout: 15000 },
      );
      return response.data ?? null;
    } catch (error: any) {
      this.logger.warn(
        `ML task-inventory extraction failed: ${error?.message ?? error}`,
      );
      return null;
    }
  }
}
