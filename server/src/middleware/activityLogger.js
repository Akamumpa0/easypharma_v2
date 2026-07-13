import { db } from '../db/index.js';
import { activityLogs } from '../db/schema.js';

/**
 * Log an activity to the database.
 */
export async function logActivity({ userId, activityType, module, action, description, req, metadata }) {
  try {
    await db.insert(activityLogs).values({
      userId,
      activityType,
      module,
      action,
      description,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (err) {
    // Never throw — logging must not break business logic
    console.error('Activity log failed:', err.message);
  }
}

/**
 * Express middleware factory — logs route activity automatically.
 * Usage: router.post('/', requireAuth, auditLog('users', 'create_user'), handler)
 */
export function auditLog(module, action, descFn) {
  return async (req, res, next) => {
    // Run after response is sent
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only log on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const description = descFn ? descFn(req, body) : `${action} on ${module}`;
        logActivity({
          userId: req.user.id,
          activityType: deriveActivityType(action),
          module,
          action,
          description,
          req,
          metadata: { statusCode: res.statusCode },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

function deriveActivityType(action) {
  if (action.startsWith('create') || action.startsWith('add')) return 'create';
  if (action.startsWith('update') || action.startsWith('edit')) return 'update';
  if (action.startsWith('delete') || action.startsWith('remove')) return 'delete';
  if (action.startsWith('login') || action.startsWith('logout')) return action;
  if (action.startsWith('sale') || action.startsWith('bill')) return 'sale';
  if (action.startsWith('purchase')) return 'purchase';
  if (action.startsWith('return')) return 'return';
  if (action.startsWith('export')) return 'export';
  if (action.startsWith('import')) return 'import';
  return 'update';
}
