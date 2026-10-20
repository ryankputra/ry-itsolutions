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
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3005
      },
      autorestart: true,
      watch: false
    },
    {
      name: "shoppepay-gateway",
      cwd: "../shoppepay-gateway",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3003
      },
      autorestart: true,
      watch: false
    }
  ]
};
