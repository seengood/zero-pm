import { render, screen } from '@testing-library/react';
import PresenceIndicator from '../PresenceIndicator';

describe('PresenceIndicator', () => {
    const mockUsers = [
        { userId: '1', displayName: 'User One', timestamp: 0 },
        { userId: '2', displayName: 'User Two', timestamp: 0 },
        { userId: '3', displayName: 'User Three', timestamp: 0 },
        { userId: '4', displayName: 'User Four', timestamp: 0 },
    ];

    it('should render nothing when no users', () => {
        const { container } = render(<PresenceIndicator users={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render avatar image when provided', () => {
        const usersWithAvatar = [{ userId: '1', displayName: 'User One', avatarUrl: 'http://example.com/avatar.png', timestamp: 0 }];
        render(<PresenceIndicator users={usersWithAvatar} />);

        const img = screen.getByAltText('User One');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'http://example.com/avatar.png');
    });

    it('should render user avatars up to maxDisplay', () => {
        render(<PresenceIndicator users={mockUsers} maxDisplay={3} />);

        expect(screen.getByTitle('User One')).toBeInTheDocument();
        expect(screen.getByTitle('User Two')).toBeInTheDocument();
        expect(screen.getByTitle('User Three')).toBeInTheDocument();
        expect(screen.queryByTitle('User Four')).not.toBeInTheDocument();
    });

    it('should render remaining count', () => {
        render(<PresenceIndicator users={mockUsers} maxDisplay={2} />);

        expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should render correct label for single user', () => {
        render(<PresenceIndicator users={[mockUsers[0]]} />);
        expect(screen.getByText('User One님이 편집 중')).toBeInTheDocument();
    });

    it('should render correct label for multiple users', () => {
        render(<PresenceIndicator users={mockUsers} />);
        expect(screen.getByText('4명이 편집 중')).toBeInTheDocument();
    });
});
