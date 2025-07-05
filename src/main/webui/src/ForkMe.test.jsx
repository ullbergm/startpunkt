/** @jsxImportSource preact */
import { render, screen } from '@testing-library/preact';
import { ForkMe } from './ForkMe'; // use named import to match export

describe('ForkMe component', () => {
    test('renders anchor with correct href and attributes', () => {
        render(<ForkMe />);
        const link = screen.getByLabelText(/view source on github/i);
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://github.com/ullbergm/startpunkt');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('appends link prop correctly', () => {
        render(<ForkMe link="some/path" />);
        const link = screen.getByLabelText(/view source on github/i);
        expect(link).toHaveAttribute('href', 'https://github.com/ullbergm/startpunkt/some/path');
    });

    test('applies color style to svg', () => {
        const color = '#123456';
        render(<ForkMe color={color} />);
        const link = screen.getByLabelText(/view source on github/i);
        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveStyle(`color: ${color}`);
    });

    test('defaults color style to #fff', () => {
        render(<ForkMe />);
        const link = screen.getByLabelText(/view source on github/i);
        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveStyle('color: #fff');
    });


    test('svg has aria-hidden attribute', () => {
        render(<ForkMe />);
        const link = screen.getByLabelText(/view source on github/i);
        const svg = link.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
});
