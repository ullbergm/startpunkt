import { render, screen } from '@testing-library/preact';
import { 
  Skeleton, 
  ApplicationSkeleton, 
  ApplicationGroupSkeleton,
  BookmarkSkeleton,
  BookmarkGroupSkeleton,
  PageSkeleton 
} from './Skeleton';

describe('Skeleton', () => {
  describe('Base Skeleton', () => {
    it('should render with default props', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('should apply custom dimensions', () => {
      const { container } = render(<Skeleton width="200px" height="50px" />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveClass('skeleton', 'custom-class');
    });
  });

  describe('ApplicationSkeleton', () => {
    it('should render application card skeleton', () => {
      const { container } = render(<ApplicationSkeleton />);
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
      expect(container.querySelector('[aria-label="Loading application..."]')).toBeInTheDocument();
    });

    it('should render with layout preferences', () => {
      const layoutPrefs = {
        getCSSVariables: () => ({ '--card-padding': '2rem' })
      };
      const { container } = render(<ApplicationSkeleton layoutPrefs={layoutPrefs} />);
      const wrapper = container.querySelector('[role="status"]');
      expect(wrapper).toHaveStyle({ padding: '2rem' });
    });

    it('should render icon and content skeletons', () => {
      const { container } = render(<ApplicationSkeleton />);
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(1); // Icon + multiple content skeletons
    });
  });

  describe('ApplicationGroupSkeleton', () => {
    it('should render application group with default count', () => {
      const { container } = render(<ApplicationGroupSkeleton />);
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
      expect(container.querySelector('[aria-label="Loading application group..."]')).toBeInTheDocument();
    });

    it('should render specified number of applications', () => {
      const { container } = render(<ApplicationGroupSkeleton count={5} />);
      const appSkeletons = container.querySelectorAll('[aria-label="Loading application..."]');
      expect(appSkeletons).toHaveLength(5);
    });

    it('should apply grid layout with column count', () => {
      const layoutPrefs = {
        preferences: { columnCount: 3, spacing: 'normal' }
      };
      const { container } = render(<ApplicationGroupSkeleton layoutPrefs={layoutPrefs} />);
      const grid = container.querySelector('.application-grid');
      expect(grid).toHaveStyle({ 
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)'
      });
    });

    it('should apply spacing from preferences', () => {
      const layoutPrefs = {
        preferences: { columnCount: 4, spacing: 'tight' }
      };
      const { container } = render(<ApplicationGroupSkeleton layoutPrefs={layoutPrefs} />);
      const grid = container.querySelector('.application-grid');
      expect(grid).toHaveStyle({ gap: '0.5rem' });
    });
  });

  describe('BookmarkSkeleton', () => {
    it('should render bookmark skeleton', () => {
      const { container } = render(<BookmarkSkeleton />);
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
      expect(container.querySelector('[aria-label="Loading bookmark..."]')).toBeInTheDocument();
    });

    it('should render icon and text skeletons', () => {
      const { container } = render(<BookmarkSkeleton />);
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBe(2); // Icon + text
    });
  });

  describe('BookmarkGroupSkeleton', () => {
    it('should render bookmark group with default count', () => {
      const { container } = render(<BookmarkGroupSkeleton />);
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
      expect(container.querySelector('[aria-label="Loading bookmark group..."]')).toBeInTheDocument();
    });

    it('should render specified number of bookmarks', () => {
      const { container } = render(<BookmarkGroupSkeleton count={7} />);
      const bookmarkSkeletons = container.querySelectorAll('[aria-label="Loading bookmark..."]');
      expect(bookmarkSkeletons).toHaveLength(7);
    });
  });

  describe('PageSkeleton', () => {
    it('should render applications page skeleton', () => {
      const { container } = render(<PageSkeleton type="applications" />);
      const groupSkeletons = container.querySelectorAll('[aria-label="Loading application group..."]');
      expect(groupSkeletons.length).toBeGreaterThan(0);
    });

    it('should render bookmarks page skeleton', () => {
      const { container } = render(<PageSkeleton type="bookmarks" />);
      const groupSkeletons = container.querySelectorAll('[aria-label="Loading bookmark group..."]');
      expect(groupSkeletons.length).toBeGreaterThan(0);
    });

    it('should pass layout preferences to application groups', () => {
      const layoutPrefs = {
        preferences: { columnCount: 2, spacing: 'relaxed' }
      };
      const { container } = render(<PageSkeleton type="applications" layoutPrefs={layoutPrefs} />);
      const grids = container.querySelectorAll('.application-grid');
      expect(grids.length).toBeGreaterThan(0);
      grids.forEach(grid => {
        expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
      });
    });

    it('should return null for invalid type', () => {
      const { container } = render(<PageSkeleton type="invalid" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', () => {
      const { container } = render(<ApplicationSkeleton />);
      const skeleton = container.querySelector('[role="status"]');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label');
    });

    it('should announce loading to screen readers', () => {
      const { container } = render(<ApplicationGroupSkeleton />);
      const skeleton = container.querySelector('[role="status"]');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading application group...');
    });
  });
});
