/**
 * parseOutput.js — Streaming XML tag parser for Claude's response
 * 
 * Extracts content from <summary>, <root_causes>, and <first_response> tags
 * as they arrive from the streaming response.
 */

/**
 * Parse accumulated text and extract content by XML section.
 * Works with partial/incomplete streams.
 * 
 * @param {string} text - Accumulated response text so far
 * @returns {{ summary: string|null, rootCauses: Array|null, firstResponse: string|null, raw: string }}
 */
export function parseStreamedOutput(text) {
  return {
    summary: extractTag(text, 'summary'),
    rootCauses: extractRootCauses(text),
    firstResponse: extractTag(text, 'first_response'),
    raw: text,
  };
}

/**
 * Extract text content between opening and closing XML tags.
 * Returns partial content if closing tag hasn't arrived yet.
 * Returns null if opening tag hasn't arrived yet.
 */
function extractTag(text, tagName) {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const openIdx = text.indexOf(openTag);

  if (openIdx === -1) return null;

  const contentStart = openIdx + openTag.length;
  const closeIdx = text.indexOf(closeTag, contentStart);

  if (closeIdx === -1) {
    // Tag opened but not closed yet — return partial content
    return text.slice(contentStart).trim();
  }

  return text.slice(contentStart, closeIdx).trim();
}

/**
 * Extract root causes from <root_causes> section.
 * Parses <cause category="..." rationale="..."/> self-closing tags.
 * Returns null if section hasn't started, empty array if started but no causes yet.
 */
function extractRootCauses(text) {
  const section = extractTag(text, 'root_causes');
  if (section === null) return null;

  const causes = [];
  const regex = /<cause\s+category="([^"]*?)"\s+rationale="([^"]*?)"\s*\/?\s*>/g;
  let match;

  while ((match = regex.exec(section)) !== null) {
    causes.push({
      category: match[1],
      rationale: match[2],
    });
  }

  return causes;
}

/**
 * Determine which section is currently being streamed.
 * Useful for showing which panel should display a loading indicator.
 */
export function getCurrentStreamSection(text) {
  if (!text) return 'waiting';

  const sections = ['summary', 'root_causes', 'first_response'];

  for (let i = sections.length - 1; i >= 0; i--) {
    const closeTag = `</${sections[i]}>`;
    if (text.includes(closeTag)) {
      // This section is complete, check if next section started
      if (i < sections.length - 1) {
        const nextOpen = `<${sections[i + 1]}>`;
        if (text.includes(nextOpen)) return sections[i + 1];
      }
      return 'complete';
    }

    const openTag = `<${sections[i]}>`;
    if (text.includes(openTag)) return sections[i];
  }

  return 'waiting';
}
