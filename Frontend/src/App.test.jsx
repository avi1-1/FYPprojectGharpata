/**
 * Frontend Unit Tests – GharPata React App
 * Framework: Vitest + React Testing Library
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock the Google OAuth provider so it doesn't need a real clientId
vi.mock('@react-oauth/google', () => ({
    GoogleOAuthProvider: ({ children }) => children,
    useGoogleLogin: vi.fn(() => vi.fn()),
    GoogleLogin: () => <button>Google Login</button>,
}));

// Mock axios-based API calls
vi.mock('./api/auth', () => ({
    login: vi.fn(),
    register: vi.fn(),
}));

import { login } from './api/auth';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

// =============================================================================
// Helper: render a component inside a MemoryRouter
// =============================================================================
const renderWithRouter = (component, { route = '/' } = {}) =>
    render(<MemoryRouter initialEntries={[route]}>{component}</MemoryRouter>);

// =============================================================================
// 1. LoginPage – Rendering
// =============================================================================
describe('LoginPage – Rendering', () => {
    const mockSetToken = vi.fn();
    const mockSetUser = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the login heading', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByText(/Login to Your Account/i)).toBeTruthy();
    });

    it('renders email and password inputs', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByPlaceholderText(/your@email.com/i)).toBeTruthy();
        expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    });

    it('renders three role tabs: Tenant, Owner, Admin', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByText('Tenant')).toBeTruthy();
        expect(screen.getByText('Owner')).toBeTruthy();
        expect(screen.getByText('Admin')).toBeTruthy();
    });

    it('renders the submit button', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByRole('button', { name: /login as/i })).toBeTruthy();
    });

    it('renders "Forgot password?" link', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByText(/forgot password/i)).toBeTruthy();
    });

    it('renders "New to GharPata?" registration prompt', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByText(/New to GharPata/i)).toBeTruthy();
    });
});

// =============================================================================
// 2. LoginPage – Role Tab Interaction
// =============================================================================
describe('LoginPage – Role Selection', () => {
    const mockSetToken = vi.fn();
    const mockSetUser = vi.fn();

    beforeEach(() => vi.clearAllMocks());

    it('defaults to Tenant role (button says "Login as Tenant")', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        expect(screen.getByRole('button', { name: /Login as Tenant/i })).toBeTruthy();
    });

    it('switches to Admin role when Admin tab is clicked', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        fireEvent.click(screen.getByText('Admin'));
        expect(screen.getByRole('button', { name: /Login as Admin/i })).toBeTruthy();
    });

    it('switches to Owner role when Owner tab is clicked', () => {
        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);
        fireEvent.click(screen.getByText('Owner'));
        expect(screen.getByRole('button', { name: /Login as Landlord/i })).toBeTruthy();
    });
});

// =============================================================================
// 3. LoginPage – Form Submission (Success)
// =============================================================================
describe('LoginPage – Successful Login', () => {
    const mockSetToken = vi.fn();
    const mockSetUser = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Stub localStorage
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    });

    it('calls login API with email and password on submit', async () => {
        login.mockResolvedValue({
            token: 'fake-jwt',
            user: { role: 'tenant', name: 'Test User' },
        });

        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);

        fireEvent.change(screen.getByPlaceholderText(/your@email.com/i), {
            target: { value: 'tenant@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Login as Tenant/i }));

        await waitFor(() => {
            expect(login).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'tenant@test.com', password: 'password123' })
            );
        });
    });

    it('calls setToken and setUser on successful login', async () => {
        login.mockResolvedValue({
            token: 'fake-jwt-token',
            user: { role: 'tenant', name: 'Test User' },
        });

        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);

        fireEvent.change(screen.getByPlaceholderText(/your@email.com/i), {
            target: { value: 'tenant@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Login as Tenant/i }));

        await waitFor(() => {
            expect(mockSetToken).toHaveBeenCalledWith('fake-jwt-token');
            expect(mockSetUser).toHaveBeenCalledWith({ role: 'tenant', name: 'Test User' });
        });
    });
});

// =============================================================================
// 4. LoginPage – Form Submission (Failure)
// =============================================================================
describe('LoginPage – Failed Login', () => {
    const mockSetToken = vi.fn();
    const mockSetUser = vi.fn();

    beforeEach(() => vi.clearAllMocks());

    it('displays error message on failed login', async () => {
        login.mockRejectedValue({
            response: { data: { message: 'Invalid credentials' } },
        });

        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);

        fireEvent.change(screen.getByPlaceholderText(/your@email.com/i), {
            target: { value: 'wrong@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'wrongpassword' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Login as Tenant/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeTruthy();
        });
    });

    it('re-enables the submit button after failed login', async () => {
        login.mockRejectedValue({ message: 'Network Error' });

        renderWithRouter(<LoginPage setToken={mockSetToken} setUser={mockSetUser} />);

        fireEvent.change(screen.getByPlaceholderText(/your@email.com/i), {
            target: { value: 'x@x.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Login as Tenant/i }));

        await waitFor(() => {
            const btn = screen.getByRole('button', { name: /Login as Tenant/i });
            expect(btn.disabled).toBe(false);
        });
    });
});

// =============================================================================
// 5. LandingPage – Smoke Test
// =============================================================================
describe('LandingPage – Rendering', () => {
    it('renders without crashing', () => {
        renderWithRouter(<LandingPage />);
    });

    it('contains GharPata brand name', () => {
        renderWithRouter(<LandingPage />);
        const gharpataTexts = screen.getAllByText(/GharPata/i);
        expect(gharpataTexts.length).toBeGreaterThan(0);
    });

    it('has a link to login or register', () => {
        renderWithRouter(<LandingPage />);
        // At least one link pointing to /login or /register
        const links = document.querySelectorAll('a[href="/login"], a[href="/register"]');
        expect(links.length).toBeGreaterThan(0);
    });
});
