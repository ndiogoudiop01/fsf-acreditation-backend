import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../kernel/errors/domain.error.js';
import { ERROR_KIND_HTTP_STATUS } from '../kernel/errors/error-catalog.js';
import type { ApiErrorEnvelope } from '../dto/api-response.dto.js';

/**
 * Traduit toute exception (metier, HTTP Nest, ou inattendue) vers
 * l'enveloppe `{ success: false, error, requestId, timestamp }`. Les
 * erreurs inattendues sont journalisees avec la stack complete mais jamais
 * renvoyees au client (pas de fuite de details internes).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? randomUUID();

    const { status, body } = this.toEnvelope(exception, requestId);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private toEnvelope(
    exception: unknown,
    requestId: string,
  ): { status: number; body: ApiErrorEnvelope } {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainError) {
      return {
        status: ERROR_KIND_HTTP_STATUS[exception.kind],
        body: {
          success: false,
          error: {
            code: exception.code,
            message: exception.message,
            details: exception.details,
          },
          requestId,
          timestamp,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            exception.message);
      return {
        status,
        body: {
          success: false,
          error: {
            code: HttpStatus[status] ?? 'HTTP_ERROR',
            message: Array.isArray(message) ? message.join(', ') : message,
            details:
              typeof payload === 'object'
                ? (payload as Record<string, unknown>)
                : undefined,
          },
          requestId,
          timestamp,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Une erreur interne est survenue.',
        },
        requestId,
        timestamp,
      },
    };
  }
}
