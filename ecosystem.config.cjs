module.exports = {
  apps: [
    {
      name: "sijagaair-app",
      cwd: __dirname,
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 4173",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    },
  ],
};
