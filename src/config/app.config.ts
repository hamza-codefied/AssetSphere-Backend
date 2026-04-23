export const appConfig = () => ({
  app: {
    name: process.env.APP_NAME ?? 'AssetSphere API',
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 4000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
});
