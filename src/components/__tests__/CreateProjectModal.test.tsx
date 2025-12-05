import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateProjectModal from '../CreateProjectModal';
import { createProject } from '@/lib/projects';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/projects', () => ({
    ...jest.requireActual('@/lib/projects'),
    createProject: jest.fn(),
}));
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => ({ auth: {} })),
}));

describe('CreateProjectModal', () => {
    const mockOnClose = jest.fn();
    const mockRouter = { refresh: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });
    // ... (existing tests)

    it('should create project and close modal on success', async () => {
        (createProject as jest.Mock).mockResolvedValue({ data: { id: '1' }, error: null });

        render(<CreateProjectModal isOpen={true} onClose={mockOnClose} />);

        fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: 'New Project' } });
        fireEvent.click(screen.getByText('생성'));

        await waitFor(() => {
            expect(createProject).toHaveBeenCalledWith({
                title: 'New Project',
                description: undefined,
                start_date: undefined,
                target_end_date: undefined,
                status: 'planning'
            }, expect.anything());
        });

        expect(mockRouter.refresh).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not render when isOpen is false', () => {
        render(<CreateProjectModal isOpen={false} onClose={mockOnClose} />);
        expect(screen.queryByText('새 프로젝트 생성')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
        render(<CreateProjectModal isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByText('새 프로젝트 생성')).toBeInTheDocument();
        expect(screen.getByLabelText('프로젝트 이름')).toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', () => {
        render(<CreateProjectModal isOpen={true} onClose={mockOnClose} />);
        const buttons = screen.getAllByRole('button');
        const cancelButton = buttons.find(btn => btn.textContent === '취소');
        if (cancelButton) {
            fireEvent.click(cancelButton);
        }
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show validation error for empty title', async () => {
        render(<CreateProjectModal isOpen={true} onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('생성'));

        await waitFor(() => {
            expect(screen.getByText('프로젝트 이름을 입력해주세요.')).toBeInTheDocument();
        });
        expect(createProject).not.toHaveBeenCalled();
    });



    it('should show error message on API failure', async () => {
        (createProject as jest.Mock).mockResolvedValue({ data: null, error: 'API Error' });

        render(<CreateProjectModal isOpen={true} onClose={mockOnClose} />);

        fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: 'New Project' } });
        fireEvent.click(screen.getByText('생성'));

        await waitFor(() => {
            expect(screen.getByText('API Error')).toBeInTheDocument();
        });
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
