// Jest stand-in for expo-document-picker, used by every test (a root __mocks__ file replaces
// the node module automatically). By default the user cancels; tests set what is picked.
type Asset = { name: string; uri: string; lastModified: number; size?: number; mimeType?: string };
type Result = { canceled: true; assets: null } | { canceled: false; assets: Asset[] };

export const getDocumentAsync = jest.fn(async (): Promise<Result> => ({ canceled: true, assets: null }));
