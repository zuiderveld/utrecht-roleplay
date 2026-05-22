/**
 * Vercel serverless — alle /api/* routes
 */
const serverless = require('serverless-http');
const app = require('./_lib/app');

module.exports = serverless(app);
