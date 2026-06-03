import { DocumentExtractionPayload } from '../documents.interfaces';

export interface ParserInput {
  factoryId: number;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  documentType?: string;
}

export interface IParserAdapter {
  parse(input: ParserInput): Promise<{
    document_type_detected: string;
    payload: DocumentExtractionPayload;
    warnings?: string[];
  }>;
}

export const PARSER_ADAPTER = 'PARSER_ADAPTER';
