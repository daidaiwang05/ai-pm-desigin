import { describe, it, expect, vi } from 'vitest';
import { Response } from 'express';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

describe('Response Utilities', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe('sendSuccess', () => {
    it('should send success response with default status 200', () => {
      const data = { id: '1', name: 'Test' };
      sendSuccess(mockRes as Response, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('should send success response with custom status', () => {
      const data = { id: '1' };
      sendSuccess(mockRes as Response, data, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should include meta when provided', () => {
      const data = [{ id: '1' }];
      const meta = { page: 1, pageSize: 10, total: 100, totalPages: 10 };
      sendSuccess(mockRes as Response, data, 200, meta);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta,
      });
    });
  });

  describe('sendError', () => {
    it('should send error response with default status 400', () => {
      sendError(mockRes as Response, 'VALIDATION_ERROR', 'Invalid input');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: undefined,
        },
      });
    });

    it('should send error response with custom status', () => {
      sendError(mockRes as Response, 'UNAUTHORIZED', 'Not authenticated', 401);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should include details when provided', () => {
      const details = [{ field: 'email', message: 'Invalid email' }];
      sendError(mockRes as Response, 'VALIDATION_ERROR', 'Invalid input', 400, details);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details,
        },
      });
    });
  });

  describe('sendPaginated', () => {
    it('should send paginated response', () => {
      const data = [{ id: '1' }, { id: '2' }];
      sendPaginated(mockRes as Response, data, 50, 1, 10);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta: {
          page: 1,
          pageSize: 10,
          total: 50,
          totalPages: 5,
        },
      });
    });

    it('should calculate total pages correctly', () => {
      sendPaginated(mockRes as Response, [], 25, 1, 10);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            totalPages: 3,
          }),
        })
      );
    });
  });
});
