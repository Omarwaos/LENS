import express from 'express';
import { AppError } from '../utils.js';

function requireJson(req, res, next) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.get('content-type') ?? '')) {
    throw new AppError('Usa Content-Type: application/json.', 415);
  }
  next();
}

function requireObject(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('Se esperaba un objeto JSON.');
  }
  next();
}

export const jsonBody = [
  requireJson,
  express.json({ limit: '64kb', strict: false, inflate: false }),
  requireObject,
];
