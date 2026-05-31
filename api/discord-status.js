/** /api/discord-status — zelfde als /api/status?discord=1 */
module.exports = async function handler(req, res) {
  const q = req.query || {};
  req.query = { ...q, discord: '1' };
  const url = req.url || '';
  if (!url.includes('discord=1')) {
    req.url = url + (url.includes('?') ? '&' : '?') + 'discord=1';
  }
  return require('./status')(req, res);
};
