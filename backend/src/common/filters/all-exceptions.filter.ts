import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../shared/logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception?.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception?.message || 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      message: status === HttpStatus.INTERNAL_SERVER_ERROR 
        ? 'Internal server error' 
        : message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Log error with stack trace
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception?.stack,
      'AllExceptionsFilter',
    );

    response.status(status).json(errorResponse);
  }
}
