import { IStorageService } from './storage.interface';
import { LocalStorageService } from './local.storage';

export function createStorageService(): IStorageService {
  // Future: check config for S3 and return S3StorageService
  return new LocalStorageService();
}

export type { IStorageService };
