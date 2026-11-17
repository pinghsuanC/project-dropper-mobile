// Jest mock for expo-file-system (root __mocks__ replace node modules automatically). Only
// what the app uses: `new File(uri)` with `digest` and `upload`. Tests drive the two jest.fn()s
// below, importing them through 'expo-file-system' so they get this same instance.
import type { UploadOptions, UploadResult } from 'expo-file-system';

export const UploadType = { BINARY_CONTENT: 0, MULTIPART: 1 } as const;

/** (uri, algorithm) → lowercase hex. Default: a fixed 64-char hash. */
export const mockDigest = jest.fn(async (_uri: string, _algorithm: string) => 'ab'.repeat(32));

/** (uri, url, options) → the upload result. Default: 200. */
export const mockUpload = jest.fn(
  async (_uri: string, _url: string, _options?: UploadOptions): Promise<UploadResult> => ({ status: 200, body: '', headers: {} }),
);

export class File {
  constructor(readonly uri: string) {}

  digest(algorithm: string): Promise<string> {
    return mockDigest(this.uri, algorithm);
  }

  upload(url: string, options?: UploadOptions): Promise<UploadResult> {
    return mockUpload(this.uri, url, options);
  }
}
