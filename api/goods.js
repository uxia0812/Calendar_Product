// api/goods.js — Vercel Serverless Function (CommonJS)
const REDASH_HOST = process.env.REDASH_HOST || 'redash.bunjang.io';

const QUERIES = [
  { group: 'bts',       queryId: 24366 },
  { group: 'enhypen',   queryId: 24367 },
  { group: 'seventeen', queryId: 24368 },
];

const LIMIT_PER_GROUP = 100;

async function fetchQuery(queryId, apiKey) {
  const url = `https://${REDASH_HOST}/api/queries/${queryId}/results.json?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Query ${queryId}: HTTP ${res.status}`);
  const json = await res.json();
  if (json.job) throw new Error(`Query ${queryId}: 실행 중`);
  const rows = json?.query_result?.data?.rows || [];
  return rows.slice(0, LIMIT_PER_GROUP);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  const REDASH_API_KEY = process.env.REDASH_API_KEY;
  if (!REDASH_API_KEY) {
    return res.status(500).json({ error: 'REDASH_API_KEY 환경변수 없음' });
  }

  try {
    const results = await Promise.all(
      QUERIES.map(q => fetchQuery(q.queryId, REDASH_API_KEY))
    );

    const data = {};
    QUERIES.forEach((q, i) => { data[q.group] = results[i]; });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Redash 연결 실패', detail: err.message });
  }
};
