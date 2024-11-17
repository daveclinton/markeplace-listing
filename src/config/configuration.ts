export default () => ({
  rapidApi: {
    key: process.env.RAPID_API_KEY,
    imageSearchHost: 'real-time-image-search.p.rapidapi.com',
    reverseLensHost: 'google-lens2.p.rapidapi.com',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300,
  },
});
