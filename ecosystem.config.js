module.exports = {
  apps: [
    {
      name: "rystore-backend",
      cwd: "./tembak-paket-app/backend",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      autorestart: true,
      watch: false
    },
    {
      name: "rystore-gateway",
      cwd: "./tembak-paket-app/gopay-gateway",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3002
      },
      autorestart: true,
      watch: false
    },
    {
      name: "rystore-frontend",
      cwd: "./tembak-paket-app/frontend-v2",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3005",
      env: {
        NODE_ENV: "production",
        PORT: 3005
      },
      autorestart: true,
      watch: false
    }
  ]
};
