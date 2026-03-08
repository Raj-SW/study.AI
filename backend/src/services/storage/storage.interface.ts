export interface IStorageService {
  save(fileBuffer: Buffer, filename: string, subPath: string): Promise<string>;
  delete(filepath: string): Promise<void>;
  getAbsolutePath(filepath: string): string;
  read(filepath: string): Promise<Buffer>;
}
