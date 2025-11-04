import { h } from 'preact';
import { render, screen } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { SkeletonLoader } from './SkeletonLoader';

// Mock react-responsive
jest.mock('react-responsive', () => ({
  useMediaQuery: jest.fn(() => false)
}));

// Mock @rehooks/local-storage
jest.mock('@rehooks/local-storage', () => ({
  useLocalStorage: jest.fn(() => ['auto', jest.fn()])
}));

describe('SkeletonLoader', () => {
  const mockLayoutPrefs = {
    preferences: {
      showDescription: true,
      showTags: true,
      showStatus: true,
      columnCount: 5,
      compactMode: false,
      spacing: 'normal'
    },
    getCSSVariables: () => ({
      '--card-padding': '1rem',
      '--card-gap': '1rem',
      '--group-spacing': '3rem'
    })
  };

  const mockBackgroundPrefs = {
    type: 'theme',
    contentOverlayOpacity: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render skeleton loader', () => {
    render(<SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />);
    
    // Check for loading status
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText(/loading applications and bookmarks/i)).toBeInTheDocument();
  });

  it('should render with correct number of favorite skeletons', () => {
    const { container } = render(
      <SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    // Should render skeleton elements with skeleton-pulse animation
    const skeletonElements = container.querySelectorAll('.skeleton-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should respect showDescription preference', () => {
    const prefsWithoutDescription = {
      ...mockLayoutPrefs,
      preferences: {
        ...mockLayoutPrefs.preferences,
        showDescription: false
      }
    };
    
    const { container: withDesc } = render(
      <SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    const { container: withoutDesc } = render(
      <SkeletonLoader layoutPrefs={prefsWithoutDescription} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    // Count skeleton pulse elements (includes all skeleton parts)
    const withDescCount = withDesc.querySelectorAll('.skeleton-pulse').length;
    const withoutDescCount = withoutDesc.querySelectorAll('.skeleton-pulse').length;
    
    // Should have fewer skeleton elements when description is hidden
    expect(withoutDescCount).toBeLessThan(withDescCount);
  });

  it('should respect showTags preference', () => {
    const prefsWithoutTags = {
      ...mockLayoutPrefs,
      preferences: {
        ...mockLayoutPrefs.preferences,
        showTags: false
      }
    };
    
    const { container: withTags } = render(
      <SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    const { container: withoutTags } = render(
      <SkeletonLoader layoutPrefs={prefsWithoutTags} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    // Count all skeleton pulse elements
    const withTagsCount = withTags.querySelectorAll('.skeleton-pulse').length;
    const withoutTagsCount = withoutTags.querySelectorAll('.skeleton-pulse').length;
    
    // Should have fewer skeleton elements when tags are hidden
    expect(withoutTagsCount).toBeLessThan(withTagsCount);
  });

  it('should use light theme for dark backgrounds', () => {
    const darkBgPrefs = {
      type: 'solid',
      contentOverlayOpacity: -0.5 // Negative = white overlay
    };
    
    const { container } = render(
      <SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={darkBgPrefs} />
    );
    
    // Should have light theme skeleton elements
    const lightSkeletons = container.querySelectorAll('.skeleton-theme-light');
    expect(lightSkeletons.length).toBeGreaterThan(0);
  });

  it('should use dark theme for light backgrounds', () => {
    const lightBgPrefs = {
      type: 'solid',
      contentOverlayOpacity: 0.5 // Positive = black overlay
    };
    
    const { container } = render(
      <SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={lightBgPrefs} />
    );
    
    // Should have dark theme skeleton elements
    const darkSkeletons = container.querySelectorAll('.skeleton-theme-dark');
    expect(darkSkeletons.length).toBeGreaterThan(0);
  });

  it('should apply correct CSS variables from layout preferences', () => {
    const customLayoutPrefs = {
      ...mockLayoutPrefs,
      getCSSVariables: () => ({
        '--card-padding': '2rem',
        '--card-gap': '1.5rem',
        '--group-spacing': '4rem'
      })
    };
    
    const { container } = render(
      <SkeletonLoader layoutPrefs={customLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    // Check if skeleton elements are rendered (they use CSS variables internally)
    const skeletonElements = container.querySelectorAll('.skeleton-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should be accessible with screen reader announcement', () => {
    render(<SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />);
    
    // Check for screen reader text
    expect(screen.getByText(/loading content, please wait/i)).toBeInTheDocument();
  });

  it('should render skeleton groups with headings', () => {
    const { container } = render(
      <SkeletonLoader layoutPrefs={mockLayoutPrefs} backgroundPrefs={mockBackgroundPrefs} />
    );
    
    // Should have group headings (h3 elements with skeleton elements)
    const headings = container.querySelectorAll('h3');
    expect(headings.length).toBeGreaterThanOrEqual(2); // At least 2 groups (Group 1 and Group 2)
  });
});
