// Proxy para download de embeddings do GitHub Releases
// v1.33.0: Resolve CORS ao baixar embeddings

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file } = req.query;

  if (!file || !['legis-embeddings.json', 'juris-embeddings.json'].includes(file)) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const githubUrl = `https://github.com/rodrigonohlack/sentencify/releases/download/embeddings-v1/${file}`;

  try {
    console.log(`[Embeddings] Fetching ${file}...`);

    const response = await fetch(githubUrl);

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    // Stream the response
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Type', 'application/json');

    // Get the response body as buffer and send
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error(`[Embeddings] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
}
