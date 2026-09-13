import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { map, type Observable } from 'rxjs';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator.js';
import type { ApiSuccessEnvelope } from '../dto/api-response.dto.js';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? randomUUID();

    return next.handle().pipe(
      map((data): ApiSuccessEnvelope<unknown> => ({
        success: true,
        data: data ?? null,
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
