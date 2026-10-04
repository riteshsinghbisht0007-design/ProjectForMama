import { getApp } from './app.ts';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    const result = await getApp();
    cachedApp = result.app;
  }

  // Restore true requested URL from Vercel edge rewrite metadata
  const forwardedUri =
    req.headers['x-forwarded-uri'] ||
    req.headers['x-matched-path'] ||
    req.headers['x-original-uri'];

  if (forwardedUri && typeof forwardedUri === 'string') {
    if (req.url === '/api/index' || req.url === '/api' || req.url.startsWith('/api/index?')) {
      req.url = forwardedUri;
    }
  } else if (req.url && req.url.includes('__path=')) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const realPath = parsedUrl.searchParams.get('__path');
      if (realPath) {
        parsedUrl.searchParams.delete('__path');
        const remainingQuery = parsedUrl.searchParams.toString();
        const cleanPath = realPath.startsWith('/') ? realPath : `/${realPath}`;
        req.url = `/api${cleanPath}${remainingQuery ? '?' + remainingQuery : ''}`;
      }
    } catch (_) {
      const match = req.url.match(/[?&]__path=([^&]+)/);
      if (match && match[1]) {
        req.url = `/api/${decodeURIComponent(match[1])}`;
      }
    }
  } else if (req.query?.slug) {
    const slugArr = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug];
    req.url = `/api/${slugArr.join('/')}`;
  }

  // Normalize path for Express routing
  if (req.url === '' || req.url === '/') {
    req.url = '/';
  } else if (!req.url.startsWith('/api') && !req.url.startsWith('http')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : '/' + req.url}`;
  }

  return cachedApp(req, res);
}
