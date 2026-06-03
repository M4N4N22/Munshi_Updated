import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  DocumentExtractionPayload,
} from '../documents.interfaces';
import { IParserAdapter, ParserInput } from './parser-adapter.interface';

@Injectable()
export class MlParserAdapter implements IParserAdapter {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ML_URL ?? 'http://localhost:8000';
  }

  async parse(input: ParserInput): Promise<{
    document_type_detected: string;
    payload: DocumentExtractionPayload;
    warnings?: string[];
  }> {
    const response = await axios.post(`${this.baseUrl}/parse`, {
      factory_id: input.factoryId,
      file_name: input.fileName,
      mime_type: input.mimeType,
      document_type: input.documentType,
      content_base64: input.buffer.toString('base64'),
    });

    const data = response.data ?? {};
    const payload = (data.payload ?? data) as DocumentExtractionPayload;

    return {
      document_type_detected:
        data.document_type ??
        (payload as Record<string, unknown>).document_type ??
        input.documentType ??
        'UNKNOWN',
      payload,
      warnings: data.warnings,
    };
  }
}
