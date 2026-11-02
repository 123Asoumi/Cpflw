export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Authentification requise.') => new HttpError(401, msg);
export const forbidden = (msg = 'Accès refusé pour votre rôle.') => new HttpError(403, msg);
export const notFound = (msg = 'Ressource introuvable.') => new HttpError(404, msg);
export const conflict = (msg, details) => new HttpError(409, msg, details);

export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Erreur interne du serveur.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}
