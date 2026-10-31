import handleRequest from '../server.js';
import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
inject();

export default async function handler(req, res) {
  return handleRequest(req, res);
}
