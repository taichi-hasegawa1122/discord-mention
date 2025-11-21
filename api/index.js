// Vercel用のAPIエントリーポイント
// このファイルは、Vercelが自動的に/api/*ルートとして認識します

const app = require('../server.js');

module.exports = app;

