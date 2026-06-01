import { Injectable, Logger } from '@nestjs/common';
import {
  DOCUMENT_DISCOVERY_BUCKET_MAP,
  DISCOVERY_BUCKET,
  SUGGESTION_DISCOVERY_BUCKET_MAP,
} from './business-discovery.constants';
import { BusinessDiscoveryService } from './business-discovery.service';

@Injectable()
export class BusinessDiscoveryDocumentService {
  private readonly logger = new Logger(BusinessDiscoveryDocumentService.name);

  constructor(
    private readonly discoveryService: BusinessDiscoveryService,
  ) {}

  /** Called after document ingestion — reuses registry types, no duplicate parsers. */
  async contributeFromDocument(
    factoryId: number,
    documentType: string,
    suggestionTypes: string[] = [],
  ): Promise<void> {
    const bucket =
      DOCUMENT_DISCOVERY_BUCKET_MAP[documentType] ??
      this.bucketFromSuggestions(suggestionTypes);
    if (!bucket || bucket === ('BOOKKEEPING' as any) || bucket === ('BANKING' as any)) {
      this.logger.debug(`Document ${documentType} has no active discovery bucket yet`);
      return;
    }
    const boost = Math.min(30, 10 + suggestionTypes.length * 5);
    await this.discoveryService.bumpBucketCompletion(factoryId, bucket, boost);
    await this.discoveryService.markCompletedIfReady(factoryId);
  }

  private bucketFromSuggestions(types: string[]) {
    for (const t of types) {
      const b = SUGGESTION_DISCOVERY_BUCKET_MAP[t];
      if (b) return b;
    }
    return null;
  }
}
