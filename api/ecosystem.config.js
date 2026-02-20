export default {
  apps: [
    {
      name: 'speak-api',
      script: 'src/index.js',
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
