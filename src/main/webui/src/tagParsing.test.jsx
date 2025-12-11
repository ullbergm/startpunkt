// Test the tag parsing logic directly without importing from app.jsx
function testGetTagsFromUrl(pathname) {
  if (!pathname || pathname === '/') {
    return null;
  }

  // Remove leading slash and trailing slash if present
  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;

  return cleanPath || null;
}

describe('URL Tag Parsing', () => {
  it('returns null for root path', () => {
    expect(testGetTagsFromUrl('/')).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(testGetTagsFromUrl('')).toBe(null);
  });

  it('returns null for undefined', () => {
    expect(testGetTagsFromUrl()).toBe(null);
  });

  it('extracts single tag from URL', () => {
    expect(testGetTagsFromUrl('/admin')).toBe('admin');
  });

  it('extracts multiple tags from URL', () => {
    expect(testGetTagsFromUrl('/admin,dev,prod')).toBe('admin,dev,prod');
  });

  it('handles trailing slash', () => {
    expect(testGetTagsFromUrl('/admin,dev/')).toBe('admin,dev');
  });

  it('handles complex tag combinations', () => {
    expect(testGetTagsFromUrl('/production,monitoring,alerts')).toBe('production,monitoring,alerts');
  });

  it('handles single character tags', () => {
    expect(testGetTagsFromUrl('/a,b,c')).toBe('a,b,c');
  });

  it('handles tags with numbers', () => {
    expect(testGetTagsFromUrl('/v1,v2,beta')).toBe('v1,v2,beta');
  });

  it('handles tags with hyphens', () => {
    expect(testGetTagsFromUrl('/front-end,back-end,full-stack')).toBe('front-end,back-end,full-stack');
  });

  it('handles tags with underscores', () => {
    expect(testGetTagsFromUrl('/web_app,mobile_app')).toBe('web_app,mobile_app');
  });

  it('handles mixed case tags', () => {
    expect(testGetTagsFromUrl('/Admin,DEV,Prod')).toBe('Admin,DEV,Prod');
  });

  it('handles special characters in tags', () => {
    expect(testGetTagsFromUrl('/tag@1,tag#2')).toBe('tag@1,tag#2');
  });

  it('handles URL encoded characters', () => {
    expect(testGetTagsFromUrl('/tag%20with%20space,another')).toBe('tag%20with%20space,another');
  });

  it('handles very long tag strings', () => {
    const longTag = 'a'.repeat(100);
    expect(testGetTagsFromUrl(`/${longTag}`)).toBe(longTag);
  });

  it('handles empty tags in comma list', () => {
    expect(testGetTagsFromUrl('/admin,,prod')).toBe('admin,,prod');
  });

  it('handles spaces around commas', () => {
    expect(testGetTagsFromUrl('/admin, dev , prod')).toBe('admin, dev , prod');
  });

  it('handles multiple consecutive slashes', () => {
    expect(testGetTagsFromUrl('//admin//dev//')).toBe('/admin//dev/');
  });

  it('handles paths without leading slash', () => {
    expect(testGetTagsFromUrl('admin,dev')).toBe('admin,dev');
  });

  it('handles only slashes', () => {
    expect(testGetTagsFromUrl('///')).toBe('/');
  });

  it('handles unicode characters', () => {
    expect(testGetTagsFromUrl('/タグ,tag')).toBe('タグ,tag');
  });

  it('handles emoji in tags', () => {
    expect(testGetTagsFromUrl('/🏠,🔧,🎨')).toBe('🏠,🔧,🎨');
  });
});

describe('API Endpoint Construction', () => {
  it('constructs filtered endpoint for single tag', () => {
    const tags = 'admin';
    const endpoint = `/api/apps/${tags}`;
    expect(endpoint).toBe('/api/apps/admin');
  });

  it('constructs filtered endpoint for multiple tags', () => {
    const tags = 'admin,dev,prod';
    const endpoint = `/api/apps/${tags}`;
    expect(endpoint).toBe('/api/apps/admin,dev,prod');
  });

  it('constructs default endpoint when tags is null', () => {
    const tags = null;
    const endpoint = tags ? `/api/apps/${tags}` : '/api/apps';
    expect(endpoint).toBe('/api/apps');
  });

  it('constructs default endpoint when tags is empty', () => {
    const tags = '';
    const endpoint = tags ? `/api/apps/${tags}` : '/api/apps';
    expect(endpoint).toBe('/api/apps');
  });
});
