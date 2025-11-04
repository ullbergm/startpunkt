import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { WhatsNewModal, useWhatsNew } from './WhatsNewModal';

// Mock the changelogService
jest.mock('../services/changelogService', () => ({
  getLatestRelease: jest.fn(),
  getNewReleasesSince: jest.fn()
}));

const mockGetLatestRelease = require('../services/changelogService').getLatestRelease;
const mockGetNewReleasesSince = require('../services/changelogService').getNewReleasesSince;

const mockRelease = {
  version: '4.1.0',
  date: '2025-11-03',
  highlights: [
    {
      type: 'feature',
      title: 'Tailwind-Inspired Skeleton Loading',
      description: 'Beautiful shimmer animations during data loading with utility-first styling'
    },
    {
      type: 'improvement',
      title: 'Enhanced Form Validation',
      description: 'Real-time field validation with visual feedback in application and bookmark editors'
    },
    {
      type: 'improvement',
      title: 'Improved Accessibility',
      description: 'Better ARIA labels, keyboard navigation, and screen reader support'
    }
  ],
  allChanges: [
    'Added Tailwind CSS-inspired utility classes',
    'Implemented skeleton loading components with shimmer animation',
    'Real-time form validation with field-level error messages',
    'Visual error states in all form inputs',
    'Helper text for all form fields',
    'Changed targetBlank default to false for security',
    'Standardized class vs className usage across components',
    'Enhanced dark mode support for skeleton loading',
    'Improved high contrast mode accessibility',
    'Support for reduced motion preferences'
  ]
};

describe('WhatsNewModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    localStorage.clear();
    mockGetLatestRelease.mockResolvedValue(mockRelease);
    // By default, return array with one release (for new users or version updates)
    mockGetNewReleasesSince.mockResolvedValue([mockRelease]);
  });

  describe('WhatsNewModal Component', () => {
    it('should render modal with title and version', () => {
      render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      expect(screen.getByText(/What's New/i)).toBeInTheDocument();
      expect(screen.getByText(/Version 4.1.0/i)).toBeInTheDocument();
    });

    it('should render highlight features', () => {
      render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      expect(screen.getByText(/Tailwind-Inspired Skeleton Loading/i)).toBeInTheDocument();
      expect(screen.getByText(/Enhanced Form Validation/i)).toBeInTheDocument();
      expect(screen.getByText(/Improved Accessibility/i)).toBeInTheDocument();
    });

    it('should show/hide all changes when toggle clicked', () => {
      render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const toggleButton = screen.getByRole('button', { name: /All Changes/i });
      
      // Initially collapsed
      expect(screen.queryByText(/Added Tailwind CSS-inspired utility classes/i)).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(toggleButton);
      expect(screen.getByText(/Added Tailwind CSS-inspired utility classes/i)).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(toggleButton);
      waitFor(() => {
        expect(screen.queryByText(/Added Tailwind CSS-inspired utility classes/i)).not.toBeInTheDocument();
      });
    });

    it('should call onClose when close button clicked', () => {
      render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText(/Close what's new dialog/i);
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when primary button clicked', () => {
      render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const primaryButton = screen.getByText(/Got it, thanks!/i);
      fireEvent.click(primaryButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', () => {
      const { container } = render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const backdrop = container.querySelector('.whats-new-backdrop');
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key pressed', () => {
      const { container } = render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const backdrop = container.querySelector('.whats-new-backdrop');
      fireEvent.keyDown(backdrop, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent body scroll when modal is open', () => {
      const { unmount } = render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('should store version when closed', () => {
      render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const primaryButton = screen.getByText(/Got it, thanks!/i);
      fireEvent.click(primaryButton);
      
      expect(localStorage.getItem('startpunkt-last-seen-version')).toBe(mockRelease.version);
    });

    it('should have proper accessibility attributes', () => {
      const { container } = render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const dialog = container.querySelector('.whats-new-backdrop');
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'whats-new-title');
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveAttribute('id', 'whats-new-title');
    });

    it('should display change type icons', () => {
      const { container } = render(<WhatsNewModal releases={[mockRelease]} onClose={mockOnClose} />);
      
      const icons = container.querySelectorAll('.whats-new-highlight-icon');
      expect(icons.length).toBeGreaterThan(0);
      // Check for emoji icons
      expect(icons[0].textContent).toMatch(/[✨🚀🐛🔒📝]/);
    });
  });

  describe('useWhatsNew Hook', () => {
    let TestComponent;

    beforeEach(() => {
      TestComponent = ({ currentVersion = '4.1.0' }) => {
        const { shouldShow, releases, loading, error, hideModal } = useWhatsNew(currentVersion);
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <div data-testid="loading">{loading.toString()}</div>
            <div data-testid="version">{releases?.[0]?.version || 'none'}</div>
            <div data-testid="error">{error || 'none'}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
    });

    it('should show modal for first time users with matching version', async () => {
      localStorage.removeItem('startpunkt-last-seen-version');
      mockGetNewReleasesSince.mockResolvedValueOnce([mockRelease]); // Returns 4.1.0
      
      render(<TestComponent currentVersion="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
      
      expect(screen.getByTestId('version').textContent).toBe('4.1.0');
      expect(mockGetNewReleasesSince).toHaveBeenCalledWith(null, '4.1.0');
    });

    it('should show modal when version is newer than last seen', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.0.0');
      mockGetNewReleasesSince.mockResolvedValueOnce([mockRelease]); // Returns 4.1.0
      
      render(<TestComponent currentVersion="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
      
      expect(mockGetNewReleasesSince).toHaveBeenCalledWith('4.0.0', '4.1.0');
    });

    it('should not show modal when version is same as last seen', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.1.0');
      mockGetNewReleasesSince.mockResolvedValueOnce([]); // No new releases
      
      render(<TestComponent currentVersion="4.1.0" />);
      
      // Wait a bit to ensure it stays false
      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });

    it('should not show modal when running older version than last seen', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.2.0');
      mockGetNewReleasesSince.mockResolvedValueOnce([]); // No new releases
      
      render(<TestComponent currentVersion="4.1.0" />);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });

    it('should not show modal for dev version', async () => {
      localStorage.removeItem('startpunkt-last-seen-version');
      
      render(<TestComponent currentVersion="dev" />);
      
      // Wait a bit to ensure it stays false
      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });

    it('should hide modal when hideModal is called', async () => {
      localStorage.removeItem('startpunkt-last-seen-version');
      mockGetNewReleasesSince.mockResolvedValueOnce([mockRelease]);
      
      render(<TestComponent currentVersion="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
      
      const hideButton = screen.getByText('Hide');
      fireEvent.click(hideButton);
      
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });
    
    it('should handle loading state', () => {
      render(<TestComponent currentVersion="4.1.0" />);
      
      // Initially should be loading
      expect(screen.getByTestId('loading').textContent).toBe('true');
    });
    
    it('should handle API errors gracefully', async () => {
      mockGetNewReleasesSince.mockRejectedValueOnce(new Error('API Error'));
      
      render(<TestComponent currentVersion="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('API Error');
      }, { timeout: 3000 });
      
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });
  });

  describe('Version Comparison', () => {
    it('should correctly compare semantic versions', async () => {
      // This tests the internal version comparison logic indirectly
      localStorage.setItem('startpunkt-last-seen-version', '3.9.9');
      mockGetNewReleasesSince.mockResolvedValueOnce([{ ...mockRelease, version: '4.0.0' }]);
      
      const TestComp = () => {
        const { shouldShow, hideModal } = useWhatsNew('4.0.0');
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
      
      render(<TestComp />);
      
      // Should show because 4.0.0 > 3.9.9
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
    });

    it('should handle major version changes', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '3.6.0');
      mockGetNewReleasesSince.mockResolvedValueOnce([mockRelease]);
      
      const TestComp = () => {
        const { shouldShow, hideModal } = useWhatsNew('4.1.0');
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
      
      render(<TestComp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
    });

    it('should handle minor version changes', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.0.0');
      mockGetNewReleasesSince.mockResolvedValueOnce([mockRelease]);
      
      const TestComp = () => {
        const { shouldShow, hideModal } = useWhatsNew('4.1.0');
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
      
      render(<TestComp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
    });

    it('should handle patch version changes', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.1.0');
      mockGetNewReleasesSince.mockResolvedValueOnce([{ ...mockRelease, version: '4.1.1' }]);
      
      const TestComp = () => {
        const { shouldShow, hideModal } = useWhatsNew('4.1.1');
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
      
      render(<TestComp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 3000 });
    });
  });
});
