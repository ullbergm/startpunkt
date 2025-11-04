/**
 * Skeleton loading components with Tailwind-inspired utilities
 * These provide visual feedback while content is loading
 */

import './Skeleton.scss';

/**
 * Base skeleton component with shimmer animation
 * Uses Tailwind-inspired utility classes
 */
export function Skeleton({ width, height, className = '' }) {
  return (
    <div 
      class={`skeleton ${className}`}
      style={{ 
        ...(width && { width }),
        ...(height && { height })
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for application card using Tailwind utilities
 */
export function ApplicationSkeleton({ layoutPrefs }) {
  const cssVars = layoutPrefs?.getCSSVariables?.() || {};
  const padding = cssVars['--card-padding'] || '1rem';
  
  return (
    <div 
      class="d-flex align-items-start" 
      style={{ padding }}
      role="status"
      aria-label="Loading application..."
    >
      {/* Icon skeleton */}
      <div style={{ minWidth: '48px', minHeight: '48px', marginRight: '0.75rem' }}>
        <div class="skeleton rounded-lg w-12 h-12" />
      </div>
      
      {/* Content skeleton */}
      <div style={{ flex: 1 }}>
        <div class="skeleton rounded w-3/4 h-5 mb-2" />
        <div class="skeleton rounded w-1/2 h-4 mb-2" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div class="skeleton rounded-full w-16 h-6" />
          <div class="skeleton rounded-full w-20 h-6" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for application group using Tailwind utilities
 */
export function ApplicationGroupSkeleton({ layoutPrefs, count = 3 }) {
  const spacing = layoutPrefs?.preferences.spacing || 'normal';
  const columnCount = layoutPrefs?.preferences.columnCount || 4;
  const gapSize = spacing === 'tight' ? '0.5rem' : spacing === 'relaxed' ? '2rem' : '1rem';
  
  return (
    <div class="mb-8" role="status" aria-label="Loading application group...">
      {/* Group title skeleton */}
      <div class="skeleton rounded w-48 h-6 mb-4" />
      
      {/* Grid skeleton */}
      <div 
        class="application-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap: gapSize,
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} class="rounded-lg" style={{ 
            background: 'var(--bs-card-bg, white)', 
            border: '1px solid var(--bs-border-color, #dee2e6)',
            overflow: 'hidden'
          }}>
            <ApplicationSkeleton layoutPrefs={layoutPrefs} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for bookmark card using Tailwind utilities
 */
export function BookmarkSkeleton() {
  return (
    <div 
      class="d-flex align-items-center" 
      style={{ padding: '0.75rem' }}
      role="status"
      aria-label="Loading bookmark..."
    >
      {/* Icon skeleton */}
      <div style={{ minWidth: '24px', minHeight: '24px', marginRight: '0.75rem' }}>
        <div class="skeleton rounded w-6 h-6" />
      </div>
      
      {/* Text skeleton */}
      <div class="skeleton rounded w-2/3 h-4" />
    </div>
  );
}

/**
 * Skeleton for bookmark group using Tailwind utilities
 */
export function BookmarkGroupSkeleton({ count = 5 }) {
  return (
    <div class="mb-8" role="status" aria-label="Loading bookmark group...">
      {/* Group title skeleton */}
      <div class="skeleton rounded w-32 h-5 mb-4" />
      
      {/* Bookmark list skeleton */}
      <div class="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} class="rounded-lg" style={{ 
            background: 'var(--bs-card-bg, white)',
            border: '1px solid var(--bs-border-color, #dee2e6)'
          }}>
            <BookmarkSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for full page loading (multiple groups)
 */
export function PageSkeleton({ type = 'applications', layoutPrefs }) {
  if (type === 'applications') {
    return (
      <div class="container px-4 space-y-6">
        <ApplicationGroupSkeleton layoutPrefs={layoutPrefs} count={6} />
        <ApplicationGroupSkeleton layoutPrefs={layoutPrefs} count={4} />
      </div>
    );
  }
  
  if (type === 'bookmarks') {
    return (
      <div class="container px-4 space-y-6">
        <BookmarkGroupSkeleton count={8} />
        <BookmarkGroupSkeleton count={6} />
      </div>
    );
  }
  
  return null;
}

export default Skeleton;
