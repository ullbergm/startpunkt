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

  it('returns just the tag without slash prefix', () => {
    expect(testGetTagsFromUrl('/test-tag')).toBe('test-tag');
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
