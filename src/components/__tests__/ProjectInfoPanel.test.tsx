import React from 'react';
import { render, screen } from '@testing-library/react';
import ProjectInfoPanel from '../ProjectInfoPanel';
import { Project } from '@/lib/projects';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Calendar: () => <span data-testid="calendar-icon" />,
    Clock: () => <span data-testid="clock-icon" />,
    User: () => <span data-testid="user-icon" />,
    AlertCircle: () => <span data-testid="alert-icon" />,
}));

describe('ProjectInfoPanel', () => {
    const mockProject: Project = {
        id: '1',
        title: 'Test Project',
        description: 'This is a test project',
        owner_id: 'user-123456789',
        owner_name: 'Test User',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        start_date: '2023-01-01',
        target_end_date: '2023-12-31',
        status: 'active',
        calendar_settings: {},
    };

    it('should render project details correctly', () => {
        // Mock toLocaleDateString
        const originalToLocaleDateString = Date.prototype.toLocaleDateString;
        Date.prototype.toLocaleDateString = jest.fn(function (this: Date) {
            return `${this.getFullYear()}. ${this.getMonth() + 1}. ${this.getDate()}.`;
        });

        render(<ProjectInfoPanel project={mockProject} />);

        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('This is a test project')).toBeInTheDocument();
        expect(screen.getByText('진행 중')).toBeInTheDocument();

        // Dates
        expect(screen.getByText(/2023\. 1\. 1\./)).toBeInTheDocument();
        expect(screen.getByText(/2023\. 12\. 31\./)).toBeInTheDocument();

        // Owner Name
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.queryByText(/User user-123/)).not.toBeInTheDocument();

        // Restore
        Date.prototype.toLocaleDateString = originalToLocaleDateString;
    });

    it('should render fallback user ID when owner_name is missing', () => {
        const projectWithoutOwnerName = { ...mockProject, owner_name: undefined };
        render(<ProjectInfoPanel project={projectWithoutOwnerName} />);
        expect(screen.getByText(/User user-123/)).toBeInTheDocument();
    });

    it('should render children when provided', () => {
        render(
            <ProjectInfoPanel project={mockProject}>
                <button>Action Button</button>
            </ProjectInfoPanel>
        );

        expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should render default values for missing optional fields', () => {
        const minimalProject: Project = {
            id: '2',
            title: 'Minimal Project',
            owner_id: 'user-1',
            created_at: '2023-01-01T00:00:00Z',
            status: 'planning',
            calendar_settings: {},
        };

        render(<ProjectInfoPanel project={minimalProject} />);

        expect(screen.getByText('Minimal Project')).toBeInTheDocument();
        expect(screen.getByText('계획 중')).toBeInTheDocument();
        expect(screen.getByText('미정 ~ 미정')).toBeInTheDocument();
    });
});
