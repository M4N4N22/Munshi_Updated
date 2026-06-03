export interface StoredFileResult {
  storageRef: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageProvider {
  store(
    factoryId: number,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<StoredFileResult>;

  read(storageRef: string): Promise<Buffer>;

  delete(storageRef: string): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
