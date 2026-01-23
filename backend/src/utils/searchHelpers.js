/**
 * Highlight keywords in text
 */
export function highlightKeywords(text, keywords) {
  if (!text || !keywords || keywords.length === 0) {
    return text;
  }

  let highlightedText = text;
  
  // Remove duplicates and sort keywords by length (longest first) to avoid partial matches
  const uniqueKeywords = [...new Set(keywords)];
  const sortedKeywords = uniqueKeywords.sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    // Skip empty or whitespace-only keywords
    if (!keyword || !keyword.trim()) {
      continue;
    }
    
    // Escape special regex characters including square brackets
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    try {
      // Create case-insensitive regex with word boundaries
      const regex = new RegExp(`\\b(${escapedKeyword})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    } catch (e) {
      // If regex fails (e.g., invalid pattern), skip this keyword
      console.warn(`Failed to create regex for keyword "${keyword}":`, e.message);
      continue;
    }
  }
  
  return highlightedText;
}

/**
 * Extract snippet from content around keywords
 */
export function extractSnippet(content, keywords, maxLength = 200) {
  if (!content) {
    return '';
  }

  // If content is short enough, return it all
  if (content.length <= maxLength) {
    return content;
  }

  // Find first keyword occurrence
  let firstIndex = -1;
  
  for (const keyword of keywords) {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
      firstIndex = index;
    }
  }

  // If no keyword found, return beginning
  if (firstIndex === -1) {
    return content.substring(0, maxLength) + '...';
  }

  // Calculate snippet boundaries
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, firstIndex - halfLength);
  let end = Math.min(content.length, start + maxLength);

  // Adjust start if we're at the end
  if (end === content.length) {
    start = Math.max(0, end - maxLength);
  }

  // Find word boundaries
  if (start > 0) {
    const spaceIndex = content.indexOf(' ', start);
    if (spaceIndex !== -1 && spaceIndex < start + 20) {
      start = spaceIndex + 1;
    }
  }

  if (end < content.length) {
    const spaceIndex = content.lastIndexOf(' ', end);
    if (spaceIndex !== -1 && spaceIndex > end - 20) {
      end = spaceIndex;
    }
  }

  let snippet = content.substring(start, end);
  
  if (start > 0) {
    snippet = '...' + snippet;
  }
  if (end < content.length) {
    snippet = snippet + '...';
  }

  return snippet;
}
