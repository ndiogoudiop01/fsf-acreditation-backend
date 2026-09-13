import { randomUUID } from 'node:crypto';

/**
 * Construit une cle de stockage non devinable, prefixee par sujet, pour
 * eviter toute enumeration de documents (cahier §12 : "liens de
 * telechargement temporaires et controles par permission").
 */
export function buildDocumentStorageKey(
  subjectType: string,
  subjectId: string,
  originalName: string,
): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${subjectType.toLowerCase()}/${subjectId}/${randomUUID()}-${safeName}`;
}
