import { initializeApp, getApps } from 'firebase/app';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A',
  authDomain: 'edufy-makerlab.firebaseapp.com',
  projectId: 'edufy-makerlab',
  storageBucket: 'edufy-makerlab.firebasestorage.app',
  messagingSenderId: '273507751238',
  appId: '1:273507751238:web:c8306f6177654befa54147',
  measurementId: 'G-KZV1Q7T1H2'
};

const app = getApps().find(candidate => candidate.name === 'workshop-api')
  || initializeApp(firebaseConfig, 'workshop-api');
const db = getFirestore(app);

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const safeHttpUrl = (value, fallback) => {
  try {
    const parsed = new URL(String(value || ''));
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
};

const getRequestOrigin = req => {
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProtocol || (req.socket?.encrypted ? 'https' : 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${protocol}://${host}`;
};

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatSchedule = template => {
  const recurrence = template.recurrencePattern || {};
  const time = recurrence.time || 'time to be confirmed';

  if (template.recurrenceType === 'weekly') {
    const days = Array.isArray(recurrence.days)
      ? Array.from(new Set(recurrence.days.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)))
      : [];
    const orderedDays = days.sort((left, right) => (left === 0 ? 7 : left) - (right === 0 ? 7 : right));
    return orderedDays.length > 0 ? `Every ${orderedDays.map(day => weekdayNames[day]).join(', ')} at ${time}` : `Weekly at ${time}`;
  }

  if (typeof recurrence.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(recurrence.date)) {
    const [year, month, day] = recurrence.date.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)} at ${time}`;
  }

  return `Date to be confirmed at ${time}`;
};

const sendPage = (res, status, html) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).send(html);
};

const renderUnavailablePage = (origin, message) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Workshop unavailable · Edufy</title>
    <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f2;color:#08111f;font:16px/1.6 system-ui,sans-serif}.card{max-width:34rem;margin:1rem;padding:2rem;border:1px solid #dce2d8;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(8,17,31,.1)}a{color:#087a68;font-weight:700}</style>
  </head>
  <body><main class="card"><h1>Workshop unavailable</h1><p>${escapeHtml(message)}</p><a href="${escapeHtml(origin)}">Return to Edufy</a></main></body>
</html>`;

export default async function handler(req, res) {
  const rawSlug = Array.isArray(req.query?.slug) ? req.query.slug[0] : req.query?.slug;
  const slug = String(rawSlug || '').trim();
  const origin = getRequestOrigin(req);

  if (!/^[a-z0-9][a-z0-9-]{1,158}[a-z0-9]$/i.test(slug)) {
    return sendPage(res, 404, renderUnavailablePage(origin, 'This invitation link is incomplete or invalid.'));
  }

  try {
    const snapshot = await getDocs(query(
      collection(db, 'workshop_templates'),
      where('shareableSlug', '==', slug)
    ));

    if (snapshot.empty) {
      return sendPage(res, 404, renderUnavailablePage(origin, 'This workshop invitation could not be found.'));
    }

    const template = snapshot.docs[0].data();
    if (template.isActive === false) {
      return sendPage(res, 410, renderUnavailablePage(origin, 'Booking for this workshop is currently paused.'));
    }

    const title = String(template.title || 'Workshop invitation').trim();
    const description = String(template.description || 'Choose a session and reserve your workshop place.').trim().replace(/\s+/g, ' ');
    const schedule = formatSchedule(template);
    const socialDescription = `${description} ${schedule}`.slice(0, 300);
    const encodedSlug = encodeURIComponent(slug);
    const shareUrl = `${origin}/w/${encodedSlug}`;
    const bookingUrl = `${origin}/?mode=booking&slug=${encodedSlug}`;
    const defaultImage = `${origin}/images/makerlab-tello-python-hero-v1.png`;
    const imageUrl = safeHttpUrl(template.imageUrl, defaultImage);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Workshop invitation</title>
    <meta name="description" content="${escapeHtml(socialDescription)}">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Edufy Workshops">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(socialDescription)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(`${title} workshop invitation`)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(socialDescription)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

    <meta http-equiv="refresh" content="0;url=${escapeHtml(bookingUrl)}">
    <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f2;color:#08111f;font:16px/1.6 system-ui,sans-serif}.card{max-width:34rem;margin:1rem;padding:2rem;border:1px solid #dce2d8;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(8,17,31,.1)}a{color:#087a68;font-weight:700}</style>
  </head>
  <body>
    <main class="card"><p>Opening <strong>${escapeHtml(title)}</strong>…</p><a href="${escapeHtml(bookingUrl)}">Continue to booking</a></main>
    <script>window.location.replace(${JSON.stringify(bookingUrl)});</script>
  </body>
</html>`;

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    return sendPage(res, 200, html);
  } catch (error) {
    console.error('[Workshop API] Failed to render invitation', error);
    return sendPage(res, 500, renderUnavailablePage(origin, 'The invitation is temporarily unavailable. Please try again shortly.'));
  }
}
