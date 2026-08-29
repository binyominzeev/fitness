const API_PORT = process.env.PORT || 8787;
const WEB_PORT = process.env.WEB_PORT || 4173;

// Egy pm2 híváskor (pm2 startOrReload) mindkét folyamat elindul: API + a buildelt frontend kiszolgálása (vite preview).
module.exports = {
  apps: [
    {
      name: "fitness-api",
      script: "server/index.mjs",
      interpreter: "node",
      interpreter_args: "--env-file-if-exists=.env",
      env: {
        PORT: API_PORT,
      },
    },
    {
      name: "fitness-web",
      // közvetlenül a vite binárist hívjuk, nem "npm run"-on keresztül, hogy ne fusson felesleges extra Node-processz
      script: "node_modules/vite/bin/vite.js",
      args: `preview --port ${WEB_PORT} --host 0.0.0.0`,
      env: {
        AI_SERVER_PORT: API_PORT,
      },
    },
  ],
};
