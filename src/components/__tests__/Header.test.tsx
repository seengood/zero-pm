import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock hooks
jest.mock('@/contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

describe('Header', () => {
    const mockSignOut = jest.fn();
    const mockPush = jest.fn();
    const mockRefresh = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
            refresh: mockRefresh,
        });
    });

    it('should render logo and navigation links', () => {
        (useAuth as jest.Mock).mockReturnValue({ user: null });

        render(<Header />);

        expect(screen.getByAltText('ZeroPM - Zero-based Project Management')).toBeInTheDocument();
        expect(screen.getByText('프로젝트')).toBeInTheDocument();
        expect(screen.getByText('캘린더')).toBeInTheDocument();
        expect(screen.getByText('설정')).toBeInTheDocument();
    });

    it('should not render user info and logout button when not logged in', () => {
        (useAuth as jest.Mock).mockReturnValue({ user: null });

        render(<Header />);

        expect(screen.queryByText('로그아웃')).not.toBeInTheDocument();
    });

    it('should render user info and logout button when logged in', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'test@example.com' },
            signOut: mockSignOut,
        });

        render(<Header />);

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('로그아웃')).toBeInTheDocument();
    });

    it('should call signOut and redirect on logout click', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'test@example.com' },
            signOut: mockSignOut,
        });

        render(<Header />);

        const logoutButton = screen.getByText('로그아웃');
        fireEvent.click(logoutButton);

        expect(mockSignOut).toHaveBeenCalled();
        // Wait for async signOut if needed, but here it's mocked as sync or immediate promise
        // If signOut is async in implementation, we might need waitFor, but mock is simple here.
        // Let's assume handleLogout awaits signOut.

        // Since handleLogout is async, we need to wait for the effects.
        // However, fireEvent is synchronous. We can use waitFor or just check if mocks were called.
        // But since we mocked signOut to return undefined (implicitly), await undefined is immediate.

        // To be safe with async interactions in tests:
        // await userEvent.click(logoutButton) is better, but we used fireEvent.

        // Let's verify execution flow.
        expect(mockSignOut).toHaveBeenCalled();
        // router.push might be called after await.
        // We can use setTimeout to allow promise resolution or just await a tick.
        await new Promise(process.nextTick);

        expect(mockPush).toHaveBeenCalledWith('/login');
        expect(mockRefresh).toHaveBeenCalled();
    });
});
