export type ZohoPullItemFailure = {
  externalId: string;
  sku: string;
  detail: string;
};

export type ZohoPullSyncSummary = {
  addedCount: number;
  updatedCount: number;
  failedCount: number;
  mappingCount: number;
  syncRunId: number;
  failures?: ZohoPullItemFailure[];
};
