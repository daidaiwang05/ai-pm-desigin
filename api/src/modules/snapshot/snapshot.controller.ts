import { Response } from 'express';
import { snapshotService } from './snapshot.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class SnapshotController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId, name } = req.body;

      if (!iterationId) {
        sendError(res, 'VALIDATION_ERROR', 'iterationId 为必填项', 400);
        return;
      }

      const snapshot = await snapshotService.createSnapshot(
        iterationId,
        req.userId!,
        name
      );
      sendSuccess(res, snapshot, 201);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const snapshots = await snapshotService.listSnapshots(iterationId);
      sendSuccess(res, snapshots);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const snapshot = await snapshotService.getSnapshot(req.params.id);
      sendSuccess(res, snapshot);
    } catch (error: any) {
      if (error.message === '快照不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async restore(req: AuthRequest, res: Response): Promise<void> {
    try {
      const iteration = await snapshotService.restoreSnapshot(
        req.params.id,
        req.userId!
      );
      sendSuccess(res, iteration);
    } catch (error: any) {
      if (error.message === '快照不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async diff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { snapshotId1, snapshotId2 } = req.query;

      if (!snapshotId1 || !snapshotId2) {
        sendError(res, 'VALIDATION_ERROR', '需要提供两个快照 ID', 400);
        return;
      }

      const diff = await snapshotService.diffSnapshots(
        snapshotId1 as string,
        snapshotId2 as string
      );
      sendSuccess(res, diff);
    } catch (error: any) {
      if (error.message === '快照不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await snapshotService.deleteSnapshot(req.params.id);
      sendSuccess(res, { message: '快照已删除' });
    } catch (error: any) {
      if (error.message === '快照不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const snapshotController = new SnapshotController();
