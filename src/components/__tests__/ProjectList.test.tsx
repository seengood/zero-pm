import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectList from '../ProjectList';

// Mock CreateProjectModal to avoid testing its internals again
jest.mock('../CreateProjectModal', () => {
    return function MockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
        return isOpen ? (
            <div data-testid="mock-modal">
                <button onClick={onClose}>Close Modal</button>
            </div>
        ) : null;
    };
});

// Mock EditProjectModal
jest.mock('../EditProjectModal', () => {
    return function MockEditModal() {
        return <div data-testid="mock-edit-modal" />;
    };
});

// Mock DeleteConfirmDialog
jest.mock('../DeleteConfirmDialog', () => {
    return function MockDeleteDialog() {
        return <div data-testid="mock-delete-dialog" />;
    };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Plus: () => <span data-testid="plus-icon" />,
    Calendar: () => <span data-testid="calendar-icon" />,
    Edit2: () => <span data-testid="edit-icon" />,
    Trash2: () => <span data-testid="trash-icon" />,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        refresh: jest.fn(),
    })),
}));

// Mock supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => ({})),
}));

// Mock deleteProject
jest.mock('@/lib/projects', () => ({
    ...jest.requireActual('@/lib/projects'),
    deleteProject: jest.fn(),
}));

describe('ProjectList', () => {
    const mockProjects = [
        { id: '1', title: 'Project 1', owner_id: 'user-1', created_at: '2023-01-01T00:00:00Z', calendar_settings: {}, status: 'planning' as const },
        { id: '2', title: 'Project 2', owner_id: 'user-1', created_at: '2023-01-02T00:00:00Z', calendar_settings: {}, status: 'active' as const },
    ];

    it('should render project list with status and dates', () => {
        render(<ProjectList initialProjects={mockProjects} />);

        expect(screen.getByText('내 프로젝트')).toBeInTheDocument();
        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.getByText('Project 2')).toBeInTheDocument();

        // Status badges
        expect(screen.getByText('계획 중')).toBeInTheDocument();
        expect(screen.getByText('진행 중')).toBeInTheDocument();

        // Dates (undefined start/end dates result in '미정')
        const dateRanges = screen.getAllByText(/미정/);
        expect(dateRanges.length).toBeGreaterThan(0);
    });

    it('should render empty state when no projects', () => {
        render(<ProjectList initialProjects={[]} />);

        expect(screen.getByText('아직 생성된 프로젝트가 없습니다.')).toBeInTheDocument();
        expect(screen.getByText('첫 번째 프로젝트를 만들어보세요')).toBeInTheDocument();
    });

    it('should open modal when "New Project" button is clicked', () => {
        render(<ProjectList initialProjects={mockProjects} />);

        expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('새 프로젝트'));

        expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    });

    it('should open modal when empty state button is clicked', () => {
        render(<ProjectList initialProjects={[]} />);

        fireEvent.click(screen.getByText('첫 번째 프로젝트를 만들어보세요'));

        expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    });
});
