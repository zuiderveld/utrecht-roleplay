/**
 * Bridge state — lokaal: data/bridge-state.json | Vercel: /tmp + geheugen-cache
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = {
  players: {},
  ingameCatalog: null,
  catalogVersion: 0,
  orders: {},
};

const STATE_FILE = process.env.VERCEL
  ? path.join('/tmp', 'bridge-state.json')
  : path.join(__dirname, '..', 'data', 'bridge-state.json');

function loadState() {
  if (global.__grpBridgeState) return global.__grpBridgeState;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      global.__grpBridgeState = { ...DEFAULT_STATE, ...JSON.parse(raw) };
      if (!global.__grpBridgeState.players) global.__grpBridgeState.players = {};
      if (!global.__grpBridgeState.orders) global.__grpBridgeState.orders = {};
      return global.__grpBridgeState;
    }
  } catch (e) {
    console.error('[bridge] loadState:', e.message);
  }
  global.__grpBridgeState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  return global.__grpBridgeState;
}

function saveState(state) {
  global.__grpBridgeState = state;
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[bridge] saveState:', e.message);
  }
}

module.exports = { loadState, saveState, DEFAULT_STATE };
