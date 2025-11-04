import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { WhatsNewModal, useWhatsNew } from './WhatsNewModal';

describe('WhatsNewModal', () => {
  const mockOnClose = jest.fn();
  const currentVersion = '4.1.0';

  beforeEach(() => {
    mockOnClose.mockClear();
    localStorage.clear();
  });

  describe('WhatsNewModal Component', () => {
    it('should render modal with title and version', () => {
      render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      expect(screen.getByText(/What's New/i)).toBeInTheDocument();
      expect(screen.getByText(/Version 4.1.0/i)).toBeInTheDocument();
    });

    it('should render highlight features', () => {
      render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      expect(screen.getByText(/Tailwind-Inspired Skeleton Loading/i)).toBeInTheDocument();
      expect(screen.getByText(/Enhanced Form Validation/i)).toBeInTheDocument();
      expect(screen.getByText(/Improved Accessibility/i)).toBeInTheDocument();
    });

    it('should show/hide all changes when toggle clicked', () => {
      render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
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
      render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText(/Close what's new dialog/i);
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when primary button clicked', () => {
      render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const primaryButton = screen.getByText(/Got it, thanks!/i);
      fireEvent.click(primaryButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', () => {
      const { container } = render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const backdrop = container.querySelector('.whats-new-backdrop');
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key pressed', () => {
      const { container } = render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const backdrop = container.querySelector('.whats-new-backdrop');
      fireEvent.keyDown(backdrop, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent body scroll when modal is open', () => {
      const { unmount } = render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('should store version when closed', () => {
      render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const primaryButton = screen.getByText(/Got it, thanks!/i);
      fireEvent.click(primaryButton);
      
      expect(localStorage.getItem('startpunkt-last-seen-version')).toBe(currentVersion);
    });

    it('should have proper accessibility attributes', () => {
      const { container } = render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const dialog = container.querySelector('.whats-new-backdrop');
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'whats-new-title');
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveAttribute('id', 'whats-new-title');
    });

    it('should display change type icons', () => {
      const { container } = render(<WhatsNewModal currentVersion={currentVersion} onClose={mockOnClose} />);
      
      const icons = container.querySelectorAll('.whats-new-highlight-icon');
      expect(icons.length).toBeGreaterThan(0);
      // Check for emoji icons
      expect(icons[0].textContent).toMatch(/[✨🚀🐛🔒📝]/);
    });
  });

  describe('useWhatsNew Hook', () => {
    let TestComponent;

    beforeEach(() => {
      TestComponent = ({ version }) => {
        const { shouldShow, hideModal } = useWhatsNew(version);
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
    });

    it('should show modal for first time users', async () => {
      localStorage.removeItem('startpunkt-last-seen-version');
      
      render(<TestComponent version="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
    });

    it('should show modal when version is newer', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.0.0');
      
      render(<TestComponent version="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
    });

    it('should not show modal when version is same', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.1.0');
      
      render(<TestComponent version="4.1.0" />);
      
      // Wait a bit to ensure it stays false
      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });

    it('should not show modal when version is older', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.2.0');
      
      render(<TestComponent version="4.1.0" />);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });

    it('should hide modal when hideModal is called', async () => {
      localStorage.removeItem('startpunkt-last-seen-version');
      
      render(<TestComponent version="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
      
      const hideButton = screen.getByText('Hide');
      fireEvent.click(hideButton);
      
      expect(screen.getByTestId('should-show').textContent).toBe('false');
    });
  });

  describe('Version Comparison', () => {
    let TestComponent;

    beforeEach(() => {
      TestComponent = ({ version }) => {
        const { shouldShow, hideModal } = useWhatsNew(version);
        return (
          <div>
            <div data-testid="should-show">{shouldShow.toString()}</div>
            <button onClick={hideModal}>Hide</button>
          </div>
        );
      };
    });

    it('should correctly compare semantic versions', async () => {
      // This tests the internal version comparison logic indirectly
      localStorage.setItem('startpunkt-last-seen-version', '3.9.9');
      render(<TestComponent version="4.0.0" />);
      
      // Should show because 4.0.0 > 3.9.9
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
    });

    it('should handle major version changes', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '3.6.0');
      render(<TestComponent version="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
    });

    it('should handle minor version changes', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.0.0');
      render(<TestComponent version="4.1.0" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
    });

    it('should handle patch version changes', async () => {
      localStorage.setItem('startpunkt-last-seen-version', '4.1.0');
      render(<TestComponent version="4.1.1" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('should-show').textContent).toBe('true');
      }, { timeout: 2000 });
    });
  });
});
