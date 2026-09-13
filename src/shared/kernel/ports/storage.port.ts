export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Stockage documentaire (cahier §12) : upload direct via l'API (fichiers de
 * pieces justificatives), URLs de telechargement TEMPORAIRES et controlees
 * par permission (jamais de lien public permanent).
 */
export interface StoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
