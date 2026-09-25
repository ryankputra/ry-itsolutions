import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ry-itsolutionts.web.id';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/login',
          '/register',
          '/saya',
          '/cart',
          '/history',
          '/profile',
          '/tickets',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
