import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GanttView from '../GanttView';

// Mock external libraries
jest.mock('@svar-ui/react-gantt', () => ({
    Gantt: ({ tasks, onTaskCreate, onTaskUpdate, onTaskDelete, onLinkCreate, onLinkDelete, onLinkUpdate }) => (
        <div data-testid="mock-gantt">
            {tasks && tasks.map(t => (
                <div key={t.id} data-testid={`task-${t.id}`}>
                    {t.text} - {t.start_date}
                </div>
            ))}
            <button data-testid="btn-create-task" onClick={() => onTaskCreate({ text: 'New Task' })}>Create Task</button>
            <button data-testid="btn-update-task" onClick={() => onTaskUpdate({ id: '1', text: 'Updated Task' })}>Update Task</button>
            <button data-testid="btn-delete-task" onClick={() => onTaskDelete('1')}>Delete Task</button>
            <button data-testid="btn-create-link" onClick={() => onLinkCreate({ source: '1', target: '2', type: 'e2s' })}>Create Link</button>
            <button data-testid="btn-delete-link" onClick={() => onLinkDelete('l1')}>Delete Link</button>
            {/* Add button to trigger link update */}
            <button data-testid="btn-update-link" onClick={() => onLinkUpdate('l1', { type: 's2s' })}>Update Link</button>
        </div>
    ),
    Willow: ({ children }) => <div>{children}</div>,
}));

jest.mock('@svar-ui/react-core', () => ({
    Locale: ({ children }) => <div>{children}</div>,
}));

jest.mock('@/locales/ko.js', () => ({
    ko: {},
}));

// Mock @/lib/tasks
import { createTask, updateTask, deleteTask, createLink, deleteLink, updateLink } from '@/lib/tasks';
import { updateTaskWithOptimisticLock } from '@/lib/optimisticLocking';
import { createBaseline, getBaselines } from '@/lib/baselines';

jest.mock('@/lib/tasks', () => ({
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    createLink: jest.fn(),
    deleteLink: jest.fn(),
    updateLink: jest.fn(),
}));

jest.mock('@/lib/optimisticLocking', () => ({
    updateTaskWithOptimisticLock: jest.fn().mockResolvedValue({ success: true, newVersion: 2 }),
    saveCPMResults: jest.fn(),
    createBaseline: jest.fn(),
}));

jest.mock('@/lib/baselines', () => ({
    createBaseline: jest.fn(),
    getBaselines: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

describe('GanttView', () => {
    const mockTasks = [
        { id: 1, text: 'Task 1', start: new Date('2023-01-01'), end: new Date('2023-01-05'), duration: 4 },
        { id: 2, text: 'Task 2', start: new Date('2023-01-06'), duration: 2 },
    ];
    const mockLinks = [];
    const projectId = 'project-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render loading state initially', () => {
        render(<GanttView projectId={projectId} initialTasks={mockTasks} initialLinks={mockLinks} />);
    });

    it('should render Gantt component with processed tasks after mount', async () => {
        render(<GanttView projectId={projectId} initialTasks={mockTasks} initialLinks={mockLinks} />);

        await waitFor(() => {
            expect(screen.getByTestId('mock-gantt')).toBeInTheDocument();
        });

        // Verify task data transformation
        const task1 = screen.getByTestId('task-1');
        expect(task1).toHaveTextContent('Task 1');
        expect(task1).toHaveTextContent('2023-01-01'); // start_date string format

        const task2 = screen.getByTestId('task-2');
        expect(task2).toHaveTextContent('Task 2');
        expect(task2).toHaveTextContent('2023-01-06');
    });

    it('should call createTask when a new task is created', async () => {
        (createTask).mockResolvedValue({ data: { id: 'new-id', text: 'New Task' }, error: null });

        render(<GanttView projectId={projectId} initialTasks={mockTasks} initialLinks={mockLinks} />);
        await waitFor(() => expect(screen.getByTestId('mock-gantt')).toBeInTheDocument());

        screen.getByTestId('btn-create-task').click();

        await waitFor(() => {
            expect(createTask).toHaveBeenCalledWith(expect.objectContaining({
                project_id: projectId,
                text: 'New Task',
            }));
        });
    });

    it('should call updateTask when a task is updated', async () => {
        render(<GanttView projectId={projectId} initialTasks={mockTasks} initialLinks={mockLinks} />);
        await waitFor(() => expect(screen.getByTestId('mock-gantt')).toBeInTheDocument());

        screen.getByTestId('btn-update-task').click();

        await waitFor(() => {
            expect(updateTaskWithOptimisticLock).toHaveBeenCalledWith(
                '1',
                expect.any(Number),
                expect.objectContaining({ text: 'Updated Task' })
            );
        });
    });

    it('should auto-schedule successor when link is updated', async () => {
        const initialTasks = [
            { id: '1', text: 'Task 1', start: new Date('2023-01-01'), duration: 5, project_id: 'p1' },
            { id: '2', text: 'Task 2', start: new Date('2023-01-05'), duration: 2, project_id: 'p1' }
        ];
        const initialLinks = [
            { id: 'l1', source: '1', target: '2', type: 'e2s', lag: 0, project_id: 'p1' }
        ];

        // Mock updateLink response
        updateLink.mockResolvedValue({ data: { id: 'l1', type: 's2s', lag: 0 }, error: null });
        // updateTaskWithOptimisticLock is already mocked at the module level

        render(<GanttView projectId="p1" initialTasks={initialTasks} initialLinks={initialLinks} />);

        await waitFor(() => expect(screen.getByTestId('mock-gantt')).toBeInTheDocument());

        // Trigger the onLinkUpdate callback from the mocked Gantt component
        screen.getByTestId('btn-update-link').click();

        await waitFor(() => {
            // Expect updateLink to be called with the new link data
            expect(updateLink).toHaveBeenCalledWith('l1', expect.objectContaining({
                type: 's2s',
            }));

            // Expect updateTaskWithOptimisticLock to be called for the successor task ('2')
            // Task 1 starts on 2023-01-01. With s2s, Task 2 should also start on 2023-01-01.
            expect(updateTaskWithOptimisticLock).toHaveBeenCalledWith(
                '2',
                expect.any(Number),
                expect.objectContaining({ start_date: '2023-01-01T00:00:00.000Z' })
            );
        });
    });

    it('should call deleteTask when a task is deleted', async () => {
        (deleteTask).mockResolvedValue({ success: true, error: null });

        render(<GanttView projectId={projectId} initialTasks={mockTasks} initialLinks={mockLinks} />);
        await waitFor(() => expect(screen.getByTestId('mock-gantt')).toBeInTheDocument());

        screen.getByTestId('btn-delete-task').click();

        await waitFor(() => {
            expect(deleteTask).toHaveBeenCalledWith('1');
        });
    });

    it('should handle tasks without end date', async () => {
        const tasks = [{ id: 3, text: 'Task 3', start: new Date('2023-02-01'), duration: 1 }];
        render(<GanttView projectId={projectId} initialTasks={tasks} initialLinks={[]} />);

        await waitFor(() => {
            expect(screen.getByTestId('task-3')).toBeInTheDocument();
        });

        expect(screen.getByTestId('task-3')).toHaveTextContent('2023-02-01');
    });
});
