function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function buildSVG({ name, artist, artBase64, artMime, isPlaying }) {
  const track = esc(name.length > 26 ? name.slice(0,26)+'…' : name);
  const art = esc(artist.length > 30 ? artist.slice(0,30)+'…' : artist);

  const BARS = [
    {maxH:24,dur:'0.8s',delay:'0s'},
    {maxH:38,dur:'0.5s',delay:'0.1s'},
    {maxH:28,dur:'0.7s',delay:'0.2s'},
    {maxH:44,dur:'0.4s',delay:'0.05s'},
    {maxH:16,dur:'0.9s',delay:'0.15s'},
    {maxH:36,dur:'0.6s',delay:'0.25s'},
    {maxH:22,dur:'0.75s',delay:'0.1s'},
  ];

  const bars = isPlaying
    ? BARS.map((b,i) => {
        const x = 348 + i*12;
        const minH = Math.max(4, Math.floor(b.maxH/4));
        const y1 = 60 - b.maxH/2, y2 = 60 - minH/2;
        return `<rect x="${x}" y="${y1}" width="7" height="${b.maxH}" rx="3.5" fill="url(#barGrad)">
          <animate attributeName="height" values="${b.maxH};${minH};${b.maxH}" dur="${b.dur}" begin="${b.delay}" repeatCount="indefinite"/>
          <animate attributeName="y" values="${y1};${y2};${y1}" dur="${b.dur}" begin="${b.delay}" repeatCount="indefinite"/>
        </rect>`;
      }).join('')
    : BARS.map((_,i) => `<rect x="${348+i*12}" y="58" width="7" height="4" rx="2" fill="#333"/>`).join('');

  return `<svg width="450" height="120" viewBox="0 0 450 120" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0d14"/><stop offset="100%" stop-color="#16092b"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a855f7"/><stop offset="50%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <clipPath id="artClip"><rect x="12" y="12" width="96" height="96" rx="12"/></clipPath>
  </defs>

  <rect width="450" height="120" rx="14" fill="url(#bgGrad)"/>
  <rect width="450" height="120" rx="14" fill="none" stroke="#a855f718" stroke-width="1.5"/>
  <rect x="10" y="10" width="100" height="100" rx="13" fill="#a855f720"/>

  ${artBase64
    ? `<image href="data:${artMime};base64,${artBase64}" x="12" y="12" width="96" height="96" clip-path="url(#artClip)"/>`
    : `<rect x="12" y="12" width="96" height="96" rx="12" fill="#1a1a2e"/><text x="60" y="66" text-anchor="middle" font-size="30" fill="#333">♪</text>`
  }

  <text x="126" y="46" font-family="'Segoe UI',system-ui,sans-serif" font-size="15" font-weight="700" fill="#f0f0ff">${track}</text>
  <text x="126" y="66" font-family="'Segoe UI',system-ui,sans-serif" font-size="12" fill="#8080a0">${art}</text>

  ${isPlaying
    ? `<circle cx="128" cy="86" r="4" fill="#22d3ee"><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"/></circle>
       <text x="137" y="90" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="#22d3ee" letter-spacing="1">NOW PLAYING</text>`
    : `<text x="126" y="90" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="#555" letter-spacing="0.5">LAST PLAYED</text>`
  }

  ${bars}

  <rect x="12" y="116" width="426" height="2" rx="1" fill="url(#lineGrad)" opacity="0.7"/>
</svg>`;
}

module.exports = async function handler(req, res) {
  const user = req.query.user || 'harshaharshith';
  const API_KEY = process.env.LASTFM_API_KEY;

  try {
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${API_KEY}&format=json&limit=1`);
    const data = await r.json();
    const t = data.recenttracks.track[0];

    const isPlaying = t['@attr']?.nowplaying === 'true';
    const artUrl = t.image[3]?.['#text'] || t.image[2]?.['#text'] || '';

    let artBase64 = '', artMime = 'image/png';
    if (artUrl) {
      const ar = await fetch(artUrl);
      artBase64 = Buffer.from(await ar.arrayBuffer()).toString('base64');
      artMime = ar.headers.get('content-type') || 'image/png';
    }

    const svg = buildSVG({ name: t.name, artist: t.artist['#text'], artBase64, artMime, isPlaying });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.send(svg);
  } catch(e) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg width="450" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="120" rx="14" fill="#0d0d14"/><text x="225" y="65" text-anchor="middle" fill="#555" font-family="sans-serif">nothing playing</text></svg>`);
  }
};
