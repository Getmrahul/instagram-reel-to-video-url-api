const { createApp } = require("./src/app");
const { createResolver } = require("./src/resolveReel");
const { loadConfig } = require("./src/config");

const config = loadConfig();
const resolver = createResolver(config);
const app = createApp({ resolver, config });

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});
