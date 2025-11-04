/**
 * Changelog Service
 * Fetches and manages changelog data from GitHub releases
 */

const GITHUB_REPO = 'ullbergm/startpunkt';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
const CACHE_KEY = 'startpunkt-changelog-cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Process text to linkify issue/PR references (#123)
 */
function linkifyIssues(text) {
  // Replace #123 with clickable links to GitHub issues/PRs
  return text.replace(/#(\d+)/g, (match, issueNumber) => {
    return `<a href="https://github.com/${GITHUB_REPO}/issues/${issueNumber}" target="_blank" rel="noopener noreferrer" class="issue-link">${match}</a>`;
  });
}

/**
 * Process text to linkify GitHub usernames (@username)
 * Excludes bot accounts like Copilot
 */
function linkifyUsernames(text) {
  // Replace @username with clickable links to GitHub profiles
  // Skip bot accounts (copilot, renovate, dependabot, github-actions, imgbot)
  return text.replace(/@(\w+(?:-\w+)*)/g, (match, username) => {
    const lowerUsername = username.toLowerCase();
    const botPatterns = ['copilot', 'renovate', 'dependabot', 'github-actions', 'imgbot'];
    
    // Skip if it's a bot account
    if (botPatterns.some(bot => lowerUsername.includes(bot))) {
      return match;
    }
    
    return `<a href="https://github.com/${username}" target="_blank" rel="noopener noreferrer" class="username-link">${match}</a>`;
  });
}

/**
 * Process text to linkify both issues and usernames
 */
function linkifyText(text) {
  return linkifyUsernames(linkifyIssues(text));
}

/**
 * Fallback changelog data (used when GitHub API fails)
 */
const FALLBACK_CHANGELOG = [
  {
    version: '4.1.0',
    date: '2025-11-04',
    highlights: [
      {
        type: 'feature',
        title: 'Apply overlay opacity to preference buttons',
        description: 'Beautiful shimmer animations during data loading with utility-first styling'
      },
      {
        type: 'feature',
        title: 'Align bookmark font size with applications',
        description: 'Real-time updates via WebSocket subscriptions for applications and bookmarks'
      }
    ],
    allChanges: [
      'Apply overlay opacity to preference buttons',
      'Align bookmark font size with applications'
    ]
  }
].map(release => ({
  ...release,
  highlights: release.highlights.map(h => ({
    ...h,
    title: linkifyText(h.title),
    description: linkifyText(h.description)
  })),
  allChanges: release.allChanges.map(change => linkifyText(change))
}));

/**
 * Parse GitHub release body to extract structured information
 * Looks for sections like "## Features", "## Improvements", "## Bug Fixes"
 */
function parseReleaseBody(body) {
  if (!body) return { highlights: [], allChanges: [] };

  const highlights = [];
  const allChanges = [];
  
  // Split by lines and process
  const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
  
  let currentSection = null;
  let currentType = null;
  let pendingTitle = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for section headers
    if (line.match(/^##\s*(Features?|New)/i)) {
      currentSection = 'features';
      currentType = 'feature';
      pendingTitle = null;
      continue;
    } else if (line.match(/^##\s*(Improvements?|Enhancements?|📦\s*Enhancements?)/i)) {
      currentSection = 'improvements';
      currentType = 'improvement';
      pendingTitle = null;
      continue;
    } else if (line.match(/^##\s*(Bug\s*Fixes?|Fixes?|🐛\s*Fixes?)/i)) {
      currentSection = 'bugfixes';
      currentType = 'bugfix';
      pendingTitle = null;
      continue;
    } else if (line.match(/^##\s*(Security|🔒\s*Security)/i)) {
      currentSection = 'security';
      currentType = 'security';
      pendingTitle = null;
      continue;
    } else if (line.match(/^##\s/)) {
      // Other section, skip
      currentSection = null;
      currentType = null;
      pendingTitle = null;
      continue;
    }
    
    // Check for bold text (potential title for next line)
    const boldOnlyMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (boldOnlyMatch && currentSection) {
      pendingTitle = boldOnlyMatch[1];
      continue;
    }
    
    // Parse bullet points
    if (line.startsWith('-') || line.startsWith('*')) {
      const text = line.substring(1).trim();
      
      // Try to extract title and description from bold formatting on same line
      const boldMatch = text.match(/\*\*(.+?)\*\*:?\s*(.*)/);
      
      if (boldMatch && currentType && highlights.length < 5) {
        // Add to highlights (first 5 only)
        highlights.push({
          type: currentType,
          title: boldMatch[1],
          description: boldMatch[2] || text
        });
      }
      
      // Add to all changes
      allChanges.push(text.replace(/\*\*/g, '')); // Remove bold markers
    } else if (pendingTitle && currentType && currentSection) {
      // This line is a description for the previous bold title
      if (highlights.length < 5) {
        highlights.push({
          type: currentType,
          title: pendingTitle,
          description: line
        });
      }
      pendingTitle = null;
    }
  }
  
  return { highlights, allChanges };
}

/**
 * Transform GitHub release to our changelog format
 */
function transformGitHubRelease(release) {
  const { highlights, allChanges } = parseReleaseBody(release.body);
  
  return {
    version: release.tag_name.replace(/^v/, ''), // Remove 'v' prefix
    date: release.published_at.split('T')[0], // Extract date only
    url: release.html_url,
    highlights: highlights.map(h => ({
      ...h,
      title: linkifyText(h.title),
      description: linkifyText(h.description)
    })),
    allChanges: allChanges.map(change => linkifyText(change))
  };
}

/**
 * Get cached changelog data
 */
function getCachedChangelog() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
    
    // Cache expired
    return null;
  } catch (e) {
    console.error('Failed to read changelog cache:', e);
    return null;
  }
}

/**
 * Set cached changelog data
 */
function setCachedChangelog(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to cache changelog:', e);
  }
}

/**
 * Fetch changelog from GitHub releases
 */
export async function fetchChangelog() {
  // Try cache first
  const cached = getCachedChangelog();
  if (cached) {
    console.log('[Changelog] Using cached data');
    return cached;
  }
  
  try {
    console.log('[Changelog] Fetching from GitHub...');
    
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Note: No auth token needed for public repos, but rate limited to 60 req/hour
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const releases = await response.json();
    
    // Transform releases to our format
    const changelog = releases
      .filter(release => !release.draft && !release.prerelease) // Only published releases
      .slice(0, 10) // Keep last 10 releases
      .map(transformGitHubRelease);
    
    console.log(`[Changelog] Fetched ${changelog.length} releases from GitHub`);
    
    // Cache the results
    setCachedChangelog(changelog);
    
    return changelog;
  } catch (error) {
    console.error('[Changelog] Failed to fetch from GitHub:', error);
    console.log('[Changelog] Using fallback data');
    
    // Return fallback data
    return FALLBACK_CHANGELOG;
  }
}

/**
 * Get the latest release from changelog
 */
export async function getLatestRelease() {
  const changelog = await fetchChangelog();
  return changelog[0] || FALLBACK_CHANGELOG[0];
}

/**
 * Compare version strings (semantic versioning)
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  
  return 0;
}

/**
 * Get new releases since a specific version (not including that version)
 * If lastSeenVersion is null, returns only releases up to and including the current running version
 * @param {string} lastSeenVersion - The last version the user saw (from localStorage)
 * @param {string} currentVersion - The current running application version
 */
export async function getNewReleasesSince(lastSeenVersion, currentVersion) {
  const changelog = await fetchChangelog();
  
  // Clean up the current version (remove -SNAPSHOT suffix if present)
  const cleanCurrentVersion = currentVersion ? currentVersion.replace('-SNAPSHOT', '') : null;
  
  // If no last seen version (first time user), return only releases up to current version
  if (!lastSeenVersion) {
    if (!cleanCurrentVersion) {
      // If we don't have a current version either, return latest
      return changelog.slice(0, 1);
    }
    
    // For first-time users, show only the release that matches the running version
    const matchingRelease = changelog.filter(release => {
      return compareVersions(release.version, cleanCurrentVersion) === 0;
    });
    
    // If exact match found, return it; otherwise return nothing
    return matchingRelease.length > 0 ? matchingRelease : [];
  }
  
  // Filter releases that are newer than lastSeenVersion but not newer than current version
  const newReleases = changelog.filter(release => {
    const isNewerThanLastSeen = compareVersions(release.version, lastSeenVersion) > 0;
    
    // If we have a current version, also check that the release is not newer than it
    if (cleanCurrentVersion) {
      const isNotNewerThanCurrent = compareVersions(release.version, cleanCurrentVersion) <= 0;
      return isNewerThanLastSeen && isNotNewerThanCurrent;
    }
    
    // If no current version specified, just return releases newer than last seen
    return isNewerThanLastSeen;
  });
  
  return newReleases;
}

/**
 * Clear cached changelog (useful for testing)
 */
export function clearChangelogCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('[Changelog] Cache cleared');
  } catch (e) {
    console.error('Failed to clear changelog cache:', e);
  }
}

export default {
  fetchChangelog,
  getLatestRelease,
  getNewReleasesSince,
  clearChangelogCache
};
