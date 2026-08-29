const API_PORT = process.env.PORT || 8787;

// Egyetlen pm2 folyamat szolgálja ki a buildelt statikus frontendet ÉS az /api/ai/chat végpontot is.
module.exports = {
  apps: [
    {
      name: "fitness",
      script: "server/index.mjs",
      interpreter: "node",
      interpreter_args: "--env-file-if-exists=.env",
      env: {
        PORT: API_PORT,
      },
    },
  ],
};
