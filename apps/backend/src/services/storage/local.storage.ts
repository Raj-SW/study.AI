import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService } from './storage.interface';
import { config } from '../../config';

export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? config.UPLOAD_DIR;
  }

  async save(fileBuffer: Buffer, filename: string, subPath: string): Promise<string> {
    const dir = path.join(this.baseDir, subPath);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(filename);
    const safeName = `${uuidv4()}${ext}`;
    const filepath = path.join(subPath, safeName);
    const fullPath = path.join(this.baseDir, filepath);

    await fs.writeFile(fullPath, fileBuffer);
    return filepath;
  }

  async delete(filepath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filepath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File may already be deleted — idempotent
    }
  }

  getAbsolutePath(filepath: string): string {
    return path.resolve(this.baseDir, filepath);
  }

  async read(filepath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, filepath);
    return fs.readFile(fullPath);
  }
}
