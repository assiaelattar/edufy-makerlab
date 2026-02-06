import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

// Reuse the config (copied from services/firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
  authDomain: "edufy-makerlab.firebaseapp.com",
  projectId: "edufy-makerlab",
  storageBucket: "edufy-makerlab.firebasestorage.app",
  messagingSenderId: "273507751238",
  appId: "1:273507751238:web:c8306f6177654befa54147",
  measurementId: "G-KZV1Q7T1H2"
};

// Initialize only once
const app = initializeApp(firebaseConfig, 'workshop-api');
const db = getFirestore(app);

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    console.error("[Workshop API] No slug provided");
    return res.status(404).send("Not Found - No slug provided");
  }

  try {
    console.log(`[Workshop API] Querying for slug: ${slug}`);

    // Query workshop templates by shareableSlug
    // We do NOT filter by organizationId because this is a public link
    const q = query(
      collection(db, "workshop_templates"),
      where("shareableSlug", "==", slug)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`[Workshop API] No template found for slug: ${slug}`);
      // Fallback or 404
      return res.redirect(`/?mode=booking`);
    }

    const data = snapshot.docs[0].data();
    const title = data.title || "Workshop Invitation";
    const description = data.description || "Join us for an exciting workshop!";
    // Use a default banner if none exists
    const image = data.imageUrl || "https://images.unsplash.com/photo-1544161513-01962786227d?q=80&w=2936&auto=format&fit=crop";

    console.log(`[Workshop API] Found template: ${title}`);

    // Construct the actual destination URL
    // We assume the Vercel deployment URL or localhost if testing
    const appUrl = `https://${req.headers.host}/?mode=booking&slug=${slug}`;

    // Return HTML with Meta Tags
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        
        <!-- Facebook / Open Graph -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${appUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${appUrl}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${image}">
      </head>
      <body>
        <p>Redirecting to workshop...</p>
        <script>
          window.location.replace("${appUrl}");
        </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (error) {
    console.error("[Workshop API] Error:", error);
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}
