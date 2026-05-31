/** Route /api/discord-status → zelfde handler met discord=1 */
module.exports = async function handler(req, res) {
  req.query = { ...req.query, discord: '1' };
  return require('./status')(req, res);
};
