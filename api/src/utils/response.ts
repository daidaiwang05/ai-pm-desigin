import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, meta?: ApiResponse['meta']): void {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendError(res: Response, code: string, message: string, statusCode: number = 400, details?: any[]): void {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
  };
  res.status(statusCode).json(response);
}

export function sendPaginated<T>(res: Response, data: T[], total: number, page: number, pageSize: number): void {
  const totalPages = Math.ceil(total / pageSize);
  sendSuccess(res, data, 200, { page, pageSize, total, totalPages });
}
