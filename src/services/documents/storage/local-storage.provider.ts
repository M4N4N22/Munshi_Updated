import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  StorageProvider,
  StoredFileResult,
} from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor() {
    this.basePath =
      process.env.DOCUMENT_STORAGE_PATH ??
      path.join(process.cwd(), 'storage', 'documents');
  }

  async store(
    factoryId: number,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<StoredFileResult> {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const relDir = path.join(String(factoryId));
    const absDir = path.join(this.basePath, relDir);
    await fs.mkdir(absDir, { recursive: true });

    const uniqueName = `${Date.now()}_${safeName}`;
    const relPath = path.join(relDir, uniqueName);
    const absPath = path.join(this.basePath, relPath);

    await fs.writeFile(absPath, buffer);

    return {
      storageRef: `local://${relPath.replace(/\\/g, '/')}`,
      fileName: safeName,
      mimeType: mimeType ?? 'application/octet-stream',
      sizeBytes: buffer.length,
    };
  }

  async read(storageRef: string): Promise<Buffer> {
    const rel = this.resolveRelativePath(storageRef);
    const absPath = path.join(this.basePath, rel);
    return fs.readFile(absPath);
  }

  async delete(storageRef: string): Promise<void> {
    const rel = this.resolveRelativePath(storageRef);
    const absPath = path.join(this.basePath, rel);
    await fs.unlink(absPath).catch(() => undefined);
  }

  private resolveRelativePath(storageRef: string): string {
    if (storageRef.startsWith('local://')) {
      return storageRef.slice('local://'.length);
    }
    return storageRef;
  }
}
