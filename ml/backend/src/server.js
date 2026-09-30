const app = require('./app');
const config = require('./config/config');
const store = require('./db/store');

store.seedDefaultData().catch(console.error);

const server = app.listen(config.port, () => {
  console.log(`HeartGuard Backend listening on port ${config.port} in ${config.nodeEnv} mode`);
});

module.exports = server;
