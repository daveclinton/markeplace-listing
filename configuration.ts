export const getConfig = (): AppConfig => {
  return {
    cache: {
      host: process.env.REDIS_HOST as string,
      port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
      password: process.env.REDIS_PASSWORD as string,
    },
  };
};

export interface AppConfig {
  cache: CacheConfig;
}

export interface CacheConfig {
  host: string;
  port: number;
  password: string;
}
