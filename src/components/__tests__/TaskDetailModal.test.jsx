import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskDetailModal from '../TaskDetailModal';
import { LINK_TYPES } from '@/lib/constants';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    X: () => <span data-testid="icon-x">X</span>,
    Trash2: () => <span data-testid="icon-trash">Trash</span>,
    Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
    Clock: () => <span data-testid="icon-clock">Clock</span>,
    Percent: () => <span data-testid="icon-percent">Percent</span>,
    Link: () => <span data-testid="icon-link">Link</span>,
    Edit2: () => <span data-testid="icon-edit">Edit</span>,
    Check: () => <span data-testid="icon-check">Check</span>,
}));

describe('TaskDetailModal', () => {
    const mockTask = {
        id: '1',
        text: 'Test Task',
        start_date: '2023-01-01',
        duration: 5,
        progress: 0.5,
        type: 'task'
    };

    const mockAllTasks = [
        { id: '1', text: 'Test Task' },
        { id: '2', text: 'Predecessor Task' },
        { id: '3', text: 'Successor Task' }
    ];

    const mockLinks = [
        { id: 'l1', source: '2', target: '1', type: LINK_TYPES.FINISH_TO_START, lag: 0 }, // Predecessor
        { id: 'l2', source: '1', target: '3', type: LINK_TYPES.FINISH_TO_START, lag: 0 }  // Successor
    ];

    const mockOnClose = jest.fn();
    const mockOnSave = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnLinkCreate = jest.fn();
    const mockOnLinkDelete = jest.fn();
    const mockOnLinkUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render task details', async () => {
        render(
            <TaskDetailModal
                task={mockTask}
                allTasks={mockAllTasks}
                links={mockLinks}
                onClose={mockOnClose}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
                onLinkCreate={mockOnLinkCreate}
                onLinkDelete={mockOnLinkDelete}
                onLinkUpdate={mockOnLinkUpdate}
            />
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
        });
        expect(screen.getByText('Predecessor Task')).toBeInTheDocument();
        expect(screen.getByText('Successor Task')).toBeInTheDocument();
    });

    it('should switch to edit mode when edit button is clicked', () => {
        render(
            <TaskDetailModal
                task={mockTask}
                allTasks={mockAllTasks}
                links={mockLinks}
                onClose={mockOnClose}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
                onLinkCreate={mockOnLinkCreate}
                onLinkDelete={mockOnLinkDelete}
                onLinkUpdate={mockOnLinkUpdate}
            />
        );

        // Find edit buttons (there should be 2, one for predecessor, one for successor)
        const editButtons = screen.getAllByTitle('Edit link');
        fireEvent.click(editButtons[0]);

        // Should show save and cancel buttons
        expect(screen.getAllByText('Save').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
        // Should show inputs
        expect(screen.getByPlaceholderText('Lag')).toBeInTheDocument();
    });

    it('should call onLinkUpdate when save button is clicked', async () => {
        render(
            <TaskDetailModal
                task={mockTask}
                allTasks={mockAllTasks}
                links={mockLinks}
                onClose={mockOnClose}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
                onLinkCreate={mockOnLinkCreate}
                onLinkDelete={mockOnLinkDelete}
                onLinkUpdate={mockOnLinkUpdate}
            />
        );

        // Click edit on the first link (predecessor)
        const editButtons = screen.getAllByTitle('Edit link');
        fireEvent.click(editButtons[0]);

        // Change lag
        const lagInput = screen.getByPlaceholderText('Lag');
        fireEvent.change(lagInput, { target: { value: '2' } });

        // Click save (the one inside the link item)
        // The link save button is the second one (index 1) because the form save button is rendered in the footer
        // But wait, the footer is rendered *after* the body.
        // So the link save button (in body) should be first (index 0) if it's in the DOM order.
        // Let's check the component: Body is before Footer.
        // So link save button is index 0.
        const saveButtons = screen.getAllByText('Save');
        fireEvent.click(saveButtons[0]);

        await waitFor(() => {
            expect(mockOnLinkUpdate).toHaveBeenCalledWith('l1', {
                type: LINK_TYPES.FINISH_TO_START, // default or existing type
                lag: 2
            });
        });
    });

    it('should revert changes when cancel button is clicked', () => {
        render(
            <TaskDetailModal
                task={mockTask}
                allTasks={mockAllTasks}
                links={mockLinks}
                onClose={mockOnClose}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
                onLinkCreate={mockOnLinkCreate}
                onLinkDelete={mockOnLinkDelete}
                onLinkUpdate={mockOnLinkUpdate}
            />
        );

        // Click edit
        const editButtons = screen.getAllByTitle('Edit link');
        fireEvent.click(editButtons[0]);

        // Change lag
        const lagInput = screen.getByPlaceholderText('Lag');
        fireEvent.change(lagInput, { target: { value: '5' } });

        // Click cancel (link cancel button)
        const cancelButtons = screen.getAllByText('Cancel');
        // Footer cancel is in footer (last). Link cancel is in body (first).
        fireEvent.click(cancelButtons[0]);

        // Should return to view mode
        expect(screen.queryByPlaceholderText('Lag')).not.toBeInTheDocument();
        // Should show original value (implied by not being in edit mode)
    });
});
