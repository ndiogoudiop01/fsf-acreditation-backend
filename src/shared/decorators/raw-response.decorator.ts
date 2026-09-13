import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/** Exclut une route de l'enveloppe `{ success, data }` (exports binaires, streams, health/metrics). */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
