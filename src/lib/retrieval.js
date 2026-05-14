/**
 * retrieval.js — Weighted Token Scoring over incidents KB
 * 
 * Algorithm:
 * 1. Tokenize input (lowercase, strip punctuation, remove stop words)
 * 2. Calculate TF of each token in the query
 * 3. Calculate IDF of each token over the 40-incident corpus
 * 4. For each incident: score = Σ(TF × IDF × field_weight)
 * 5. Normalize scores to 0–1, filter below threshold, return top 3
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'am', 'about', 'up', 'down',
]);

const FIELD_WEIGHTS = {
  tags: 1.5,
  category: 1.2,
  title: 1.0,
  description: 1.0,
};

const MIN_CONFIDENCE_THRESHOLD = 0.10;

/**
 * Tokenize a string: lowercase, strip punctuation, remove stop words
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Calculate term frequency: count of each token / total tokens
 */
function computeTF(tokens) {
  const counts = {};
  for (const token of tokens) {
    counts[token] = (counts[token] || 0) + 1;
  }
  const total = tokens.length || 1;
  const tf = {};
  for (const [token, count] of Object.entries(counts)) {
    tf[token] = count / total;
  }
  return tf;
}

/**
 * Build IDF map from the full corpus of incidents
 * IDF(t) = log(N / (1 + df(t))) where df = number of docs containing t
 */
function buildIDF(incidents) {
  const N = incidents.length;
  const docFreq = {};

  for (const inc of incidents) {
    // Collect unique tokens from all fields of this incident
    const allTokens = new Set([
      ...tokenize(inc.title),
      ...tokenize(inc.description),
      ...tokenize(inc.category),
      ...(inc.tags || []).flatMap(tag => tokenize(tag)),
    ]);
    for (const token of allTokens) {
      docFreq[token] = (docFreq[token] || 0) + 1;
    }
  }

  const idf = {};
  for (const [token, df] of Object.entries(docFreq)) {
    idf[token] = Math.log(N / (1 + df));
  }
  return idf;
}

/**
 * Tokenize an incident's fields separately, with field labels
 */
function tokenizeIncident(incident) {
  return {
    title: new Set(tokenize(incident.title)),
    description: new Set(tokenize(incident.description)),
    category: new Set(tokenize(incident.category)),
    tags: new Set((incident.tags || []).flatMap(tag => tokenize(tag))),
  };
}

/**
 * Score a query against a single incident
 */
function scoreIncident(queryTF, incidentTokens, idf) {
  let score = 0;

  for (const [token, tf] of Object.entries(queryTF)) {
    const tokenIDF = idf[token] || 0;
    if (tokenIDF === 0) continue;

    for (const [field, tokens] of Object.entries(incidentTokens)) {
      if (tokens.has(token)) {
        score += tf * tokenIDF * (FIELD_WEIGHTS[field] || 1.0);
      }
    }
  }

  return score;
}

/**
 * Main retrieval function.
 * Returns top 3 incidents with confidence scores, filtered by threshold.
 * 
 * @param {string} ticketText - Raw ticket text
 * @param {Array} incidents - Array of incident objects from KB
 * @returns {Array} Top matches: [{ incident, score }]
 */
export function findSimilarIncidents(ticketText, incidents) {
  if (!ticketText || !incidents || incidents.length === 0) {
    return [];
  }

  // 1. Tokenize query and compute TF
  const queryTokens = tokenize(ticketText);
  if (queryTokens.length === 0) return [];
  const queryTF = computeTF(queryTokens);

  // 2. Build IDF over entire corpus
  const idf = buildIDF(incidents);

  // 3. Score each incident
  const scored = incidents.map(incident => {
    const incTokens = tokenizeIncident(incident);
    const rawScore = scoreIncident(queryTF, incTokens, idf);
    return { incident, rawScore };
  });

  // 4. Normalize scores to 0–1 range
  const maxScore = Math.max(...scored.map(s => s.rawScore), 0.001);
  const normalized = scored.map(s => ({
    incident: s.incident,
    score: Math.round((s.rawScore / maxScore) * 100) / 100,
  }));

  // 5. Sort descending, filter by threshold, take top 3
  return normalized
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score >= MIN_CONFIDENCE_THRESHOLD)
    .slice(0, 3);
}

export { tokenize, MIN_CONFIDENCE_THRESHOLD };
