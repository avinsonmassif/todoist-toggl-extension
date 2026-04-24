import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      rawBody?: string
    }
  }
}

export function verifyTodoist(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-todoist-hmac-sha256']
  if (!signature || typeof signature !== 'string') {
    res.status(401).end()
    return
  }

  const secret = process.env['TODOIST_VERIFICATION_TOKEN'] ?? ''
  const expected = createHmac('sha256', secret)
    .update(req.rawBody ?? '')
    .digest('base64')

  try {
    const sigBuf = Buffer.from(signature, 'base64')
    const expBuf = Buffer.from(expected, 'base64')
    if (!timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).end()
      return
    }
  } catch {
    res.status(401).end()
    return
  }

  next()
}
