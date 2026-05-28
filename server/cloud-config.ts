/**
 * Multi-Cloud Configuration
 * Supports: AWS, GCP, Azure for high-availability deployment
 */
export const cloudConfig = {
  provider: process.env.CLOUD_PROVIDER || 'aws',
  region: process.env.CLOUD_REGION || 'us-east-1',
  multiRegion: process.env.MULTI_REGION === 'true',
  cdn: {
    enabled: true,
    provider: 'cloudflare',
  },
  database: {
    primary: process.env.DB_PRIMARY || 'sqlite',
    replica: process.env.DB_REPLICA || null,
  },
};