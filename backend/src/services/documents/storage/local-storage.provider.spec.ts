import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let basePath: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'munshi-doc-'));
    process.env.DOCUMENT_STORAGE_PATH = basePath;
    provider = new LocalStorageProvider();
  });

  afterEach(async () => {
    await fs.rm(basePath, { recursive: true, force: true });
    delete process.env.DOCUMENT_STORAGE_PATH;
  });

  it('stores and reads a file by storage ref', async () => {
    const stored = await provider.store(1, 'inventory.csv', Buffer.from('a,b\n1,2'));
    expect(stored.storageRef.startsWith('local://')).toBe(true);

    const content = await provider.read(stored.storageRef);
    expect(content.toString()).toBe('a,b\n1,2');
  });
});
