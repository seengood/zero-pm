'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Gantt, Willow } from "@svar-ui/react-gantt";
import { Locale } from "@svar-ui/react-core";
import "@/styles/gantt-svar.css";
import "@/styles/gantt-custom.css";
import { ko } from "@/locales/ko.js";
import ContextMenu from "./ContextMenu";
import TaskDetailModal from "./TaskDetailModal";

const scales = [
    {
        unit: "month",
        step: 1,
        format: (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        }
    },
    {
        unit: "day",
        step: 1,
        format: (date) => String(date.getDate())
    },
];

import { createTask, updateTask, deleteTask, createLink, deleteLink, updateLink } from "@/lib/tasks";
import { createBaseline, getBaselines } from "@/lib/baselines";
import { calculateSuccessorDate, calculateEndDate, applyConstraint } from "@/lib/scheduling";
import { parseToUTC, formatDateForDisplay, toISOString as dateToISO, calculateEndDateUTC } from "@/lib/dateUtils";
import { taskEventEmitter } from "@/lib/taskEventEmitter";
import { DBObserver, UIObserver, ScheduleObserver } from "@/lib/taskObservers";
import { validateTask, normalizeTask } from "@/lib/ganttUtils";
import { createRecalculateFunction } from "@/lib/ganttScheduler";
import { useGanttObservers } from "@/hooks/useGanttObservers";
import { setupGanttIntercepts } from "@/lib/ganttIntercepts";

// Helper function to convert Date objects to ISO strings for Supabase
const toISOString = (value) => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
};

export default function GanttView({ projectId, initialTasks, initialLinks }) {
    const [mounted, setMounted] = useState(false);
    const [tasks, setTasks] = useState(initialTasks || []);
    const [links, setLinks] = useState(initialLinks || []);
    const [baselines, setBaselines] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);

    // Refs to track latest tasks and links state
    const tasksRef = useRef(tasks);
    const linksRef = useRef(links);

    // Update refs when state changes
    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        linksRef.current = links;
    }, [links]);



    useEffect(() => {
        setTasks(initialTasks || []);
    }, [initialTasks]);

    useEffect(() => {
        setLinks(initialLinks || []);
    }, [initialLinks]);



    useEffect(() => {
        async function loadBaselines() {
            const { data } = await getBaselines(projectId);
            if (data) setBaselines(data);
        }
        loadBaselines();
    }, [projectId]);

    // 날짜 문자열을 Date 객체로 변환하고 표시용 문자열 추가
    const processedTasks = React.useMemo(() => {
        return tasks.map(task => {
            let startDate = parseToUTC(task.start_date || task.start);

            // Apply scheduling constraint to adjust start date
            if (task.constraint_type && task.constraint_type !== 'asap' && startDate) {
                const calculatedEnd = calculateEndDateUTC(startDate, task.duration || 1);
                const { start } = applyConstraint(task, startDate, calculatedEnd);
                startDate = start;
            }

            // Format start date for display
            const startDateStr = formatDateForDisplay(startDate);

            // Svar Gantt requires either (start + duration) OR (start + end), not both
            // We provide start + duration and let Gantt calculate the end
            return {
                ...task,
                start: startDate,
                // Don't provide end - let Svar Gantt calculate it from start + duration
                start_date: startDateStr,
                id: String(task.id)
            };
        });
    }, [tasks]);

    const columns = [
        { id: "text", header: { text: "작업명" }, width: 200, tree: true },
        { id: "start_date", header: { text: "시작일" }, align: "center", width: 100 },
        { id: "duration", header: { text: "기간" }, align: "center", width: 60 },
        {
            id: "add-col",
            header: {
                text: "",
                css: "add-col-header",
                cell: () => (
                    <div
                        className="add-task-header-btn"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent sort trigger if any
                            handleTaskCreate({ text: "New Task", start: new Date(), duration: 1 });
                        }}
                        style={{ cursor: 'pointer', textAlign: 'center', color: '#aaa', fontSize: '20px' }}
                    >
                        +
                    </div>
                )
            },
            width: 40,
            sort: false,
            cell: ({ row: task }) => (
                <div
                    className="add-task-btn"
                    data-action="add"
                    data-id={task.id}
                    style={{ cursor: 'pointer', textAlign: 'center', color: '#aaa', fontSize: '20px' }}
                >
                    +
                </div>
            )
        }
    ];

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleTaskCreate = async (task) => {
        const newTask = {
            project_id: projectId,
            text: task.text,
            start_date: toISOString(task.start),
            duration: task.duration,
            parent_id: task.parent,
            type: task.type || 'task',
            progress: task.progress || 0
        };

        const { data, error } = await createTask(newTask);
        if (data) {
            if (task.id) {
                // Gantt UI initiated: Update local state replacing temp ID with real ID
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, id: data.id } : t));
            } else {
                // Toolbar initiated: Add new task to state
                setTasks(prev => [...prev, { ...newTask, id: data.id, start: newTask.start_date, parent: newTask.parent_id }]);
            }
            // Auto-select the newly created task
            setSelectedTaskIds([data.id]);
            return { ...task, id: data.id };
        } else {
            console.error("Failed to create task:", error);
            // Revert optimistic update if needed
        }
    };

    // validateTask and normalizeTask are now imported from ganttUtils

    const handleTaskUpdate = async (task, skipRecalculation = false) => {
        // Simply emit event - Observer handles all logic
        await taskEventEmitter.emit('task:updated', {
            task,
            changesAffectSchedule: task.start !== undefined || task.duration !== undefined || task.start_date !== undefined
        });

        // Handle schedule recalculation if needed
        if (!skipRecalculation && (task.start !== undefined || task.duration !== undefined || task.start_date !== undefined)) {
            await recalculateAffectedTasks(task.id, task);
        }

        return task;
    };

    // Create recalculateAffectedTasks function using factory pattern
    // (Must be after handleTaskUpdate definition)
    const recalculateAffectedTasks = createRecalculateFunction({
        tasksRef,
        linksRef,
        handleTaskUpdate,
        toISOString
    });

    // Initialize observers using custom hook
    const observersRef = useGanttObservers({
        tasksRef,
        linksRef,
        setTasks,
        setEditingTask,
        setLinks,
        recalculateAffectedTasks
    });

    const handleTaskDelete = async (taskId) => {
        const { error } = await deleteTask(taskId);
        if (error) {
            console.error("Failed to delete task:", error);
        } else {
            // Update local state to remove deleted task
            setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
        }
    };

    const handleLinkCreate = async (link) => {
        console.log('handleLinkCreate called with:', link);

        const newLink = {
            project_id: projectId,
            source: link.source,
            target: link.target,
            type: link.type,
            lag: link.lag || 0
        };

        // Emit link:created event
        taskEventEmitter.emit('link:created', {
            link: newLink
        });

        // Auto-schedule: Check if successor needs to move
        const predecessor = tasks.find(t => String(t.id) === String(newLink.source));
        const successor = tasks.find(t => String(t.id) === String(newLink.target));

        if (predecessor && successor) {
            const newStartDate = calculateSuccessorDate(predecessor, successor, newLink.type, newLink.lag);

            if (newStartDate) {
                const newEndDate = calculateEndDate(newStartDate, successor.duration);
                console.log(`Auto-scheduling on link create: Moving task ${successor.text} to ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`);
                await handleTaskUpdate({
                    ...successor,
                    start: newStartDate,
                    start_date: toISOString(newStartDate),
                    end: newEndDate,
                    end_date: toISOString(newEndDate)
                });
            }
        }

        return { ...link, id: newLink.id };
    };

    const handleLinkDelete = async (linkId) => {
        console.log('handleLinkDelete called with:', linkId);

        // Find the link before deletion for recalculation purposes
        const link = links.find(l => String(l.id) === String(linkId));

        // Emit link:deleted event
        taskEventEmitter.emit('link:deleted', {
            linkId,
            link // Include link object for schedule recalculation
        });
    };

    const handleLinkUpdate = async (linkId, updates) => {
        console.log('handleLinkUpdate called with:', linkId, updates);

        // Find current link
        const currentLink = links.find(l => String(l.id) === String(linkId));
        if (!currentLink) {
            console.error('Link not found:', linkId);
            return null;
        }

        // Merge updates
        const updatedLink = { ...currentLink, ...updates };

        // Emit link:updated event
        taskEventEmitter.emit('link:updated', {
            link: updatedLink,
            updates
        });

        // Auto-schedule: Check if successor needs to move
        const predecessor = tasks.find(t => String(t.id) === String(updatedLink.source));
        const successor = tasks.find(t => String(t.id) === String(updatedLink.target));

        if (predecessor && successor) {
            const newStartDate = calculateSuccessorDate(predecessor, successor, updatedLink.type, updatedLink.lag);

            if (newStartDate) {
                const newEndDate = calculateEndDate(newStartDate, successor.duration);
                console.log(`Auto-scheduling: Moving task ${successor.text} to ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`);
                return await handleTaskUpdate({
                    ...successor,
                    start: newStartDate,
                    start_date: toISOString(newStartDate),
                    end: newEndDate,
                    end_date: toISOString(newEndDate)
                });
            }
        }

        return null;
    };

    const handleCreateBaseline = async () => {
        const name = window.prompt("Enter baseline name:");
        if (!name) return;

        const { data, error } = await createBaseline(projectId, name, null, tasks, links);
        if (data) {
            setBaselines(prev => [data, ...prev]);
            alert("Baseline created successfully!");
        } else {
            alert("Failed to create baseline: " + error);
        }
    };

    const handleRecalculateDates = async () => {
        console.log('Recalculating all task dates...');

        // Build a map of task dependencies
        const taskMap = new Map(tasks.map(t => [String(t.id), t]));
        const linksByTarget = new Map();

        // Group links by target (successor)
        links.forEach(link => {
            const targetId = String(link.target);
            if (!linksByTarget.has(targetId)) {
                linksByTarget.set(targetId, []);
            }
            linksByTarget.get(targetId).push(link);
        });

        // Process tasks in topological order (predecessors before successors)
        const visited = new Set();
        const updatedTasks = [];

        const processTask = async (taskId) => {
            if (visited.has(taskId)) return;
            visited.add(taskId);

            const task = taskMap.get(taskId);
            if (!task) return;

            const predecessorLinks = linksByTarget.get(taskId) || [];

            if (predecessorLinks.length > 0) {
                // Calculate the latest required start date based on all predecessors
                let latestStartDate = null;

                for (const link of predecessorLinks) {
                    const predecessor = taskMap.get(String(link.source));
                    if (predecessor) {
                        // Process predecessor first
                        await processTask(String(link.source));

                        const predStartDate = parseToUTC(predecessor.start_date || predecessor.start);
                        const newStartDate = calculateSuccessorDate(predecessor, task, link.type, link.lag || 0);

                        if (newStartDate && (!latestStartDate || newStartDate > latestStartDate)) {
                            latestStartDate = newStartDate;
                        }
                    }
                }

                if (latestStartDate) {
                    const newEndDate = calculateEndDate(latestStartDate, task.duration);
                    console.log(`Updating ${task.text}: ${latestStartDate.toISOString()}`);

                    updatedTasks.push({
                        ...task,
                        start: latestStartDate,
                        start_date: toISOString(latestStartDate),
                        end: newEndDate,
                        end_date: toISOString(newEndDate)
                    });

                    // Update task in map for subsequent calculations
                    taskMap.set(taskId, {
                        ...task,
                        start: latestStartDate,
                        start_date: toISOString(latestStartDate)
                    });
                }
            }
        };

        // Process all tasks
        for (const task of tasks) {
            await processTask(String(task.id));
        }

        // Update all modified tasks
        for (const task of updatedTasks) {
            await handleTaskUpdate(task);
        }

        // Update local state to reflect changes immediately
        setTasks(prevTasks => {
            const taskMap = new Map(prevTasks.map(t => [String(t.id), t]));
            updatedTasks.forEach(updatedTask => {
                taskMap.set(String(updatedTask.id), updatedTask);
            });
            return Array.from(taskMap.values());
        });

        console.log(`Recalculated ${updatedTasks.length} tasks`);
        alert(`${updatedTasks.length}개 작업의 날짜를 재계산했습니다.`);
    };

    const handleContextMenu = (event) => {
        event.preventDefault();
        // Prevent default browser context menu
        // event.originalEvent.preventDefault(); 

        // Svar Gantt passes custom event object
        const { id, type, originalEvent } = event;

        if (type === "task" && id) {
            originalEvent.preventDefault();
            setContextMenu({
                x: originalEvent.clientX,
                y: originalEvent.clientY,
                taskId: id
            });
        }
    };

    const handleContextMenuAction = async (action) => {
        if (!contextMenu) return;
        const { taskId } = contextMenu;
        const task = tasks.find(t => String(t.id) === String(taskId));

        setContextMenu(null);

        switch (action) {
            case 'edit':
                setEditingTask(task);
                break;
            case 'delete':
                handleTaskDelete(taskId);
                break;
            case 'add-sibling':
                const siblingTask = {
                    text: "New Task",
                    start: new Date(),
                    duration: 1,
                    parent: task?.parent,
                    type: 'task'
                };
                handleTaskCreate(siblingTask);
                break;
            case 'add-child':
                const childTask = {
                    text: "New Subtask",
                    start: new Date(),
                    duration: 1,
                    parent: taskId,
                    type: 'task'
                };
                handleTaskCreate(childTask);
                break;
        }
    };

    if (!mounted) {
        return <div className="gantt-container">Loading...</div>;
    }

    return (
        <div className="gantt-container" onClick={(e) => {
            // Handle clicks on the custom HTML elements in the grid
            if (e.target.closest('.add-task-btn')) {
                const btn = e.target.closest('.add-task-btn');
                const taskId = btn.dataset.id;
                // Add child task
                const childTask = {
                    text: "New Task",
                    start: new Date(),
                    duration: 1,
                    parent: taskId,
                    type: 'task'
                };
                handleTaskCreate(childTask);
            }
        }}>
            <div className="gantt-toolbar" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', padding: '0 1rem' }}>
                <button
                    onClick={() => {
                        const newTask = {
                            text: "New Task",
                            start: new Date(),
                            duration: 1,
                            type: 'task'
                        };
                        handleTaskCreate(newTask);
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981', // green-500
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    + Add Task
                </button>
                <button
                    onClick={handleCreateBaseline}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }}
                >
                    Create Baseline
                </button>
                <button
                    onClick={handleRecalculateDates}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }}
                >
                    날짜 재계산
                </button>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Saved Baselines: {baselines.length}
                </div>
            </div>
            <div
                style={{ height: 'calc(100vh - 100px)', width: '100%', position: 'relative' }}
                onClick={(e) => {
                    const taskElement = e.target.closest('[data-id]');
                    if (taskElement) {
                        const taskId = taskElement.dataset.id;
                        setSelectedTaskIds([taskId]);
                    }
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    const taskElement = e.target.closest('[data-id]');
                    if (taskElement) {
                        const taskId = taskElement.dataset.id;
                        setSelectedTaskIds([taskId]);
                        setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            taskId: taskId
                        });
                    }
                }}
                onDoubleClick={(e) => {
                    const taskElement = e.target.closest('[data-id]');
                    if (taskElement) {
                        const taskId = taskElement.dataset.id;
                        const task = tasks.find(t => String(t.id) === String(taskId));
                        if (task) {
                            setEditingTask(task);
                        }
                    }
                }}
            >
                <Locale words={ko}>
                    <Willow>
                        <Gantt
                            tasks={processedTasks}
                            links={links}
                            scales={scales}
                            columns={columns}
                            init={(api) => {
                                setupGanttIntercepts(api,
                                    { handleTaskUpdate, taskEventEmitter },
                                    { tasks, links, projectId }
                                );
                            }}
                            onTaskCreate={handleTaskCreate}
                            onTaskUpdate={handleTaskUpdate}
                            onTaskDelete={handleTaskDelete}
                            onLinkCreate={handleLinkCreate}
                            onLinkDelete={handleLinkDelete}
                            onLinkUpdate={handleLinkUpdate}
                            selected={selectedTaskIds}
                            select={true}
                        />
                    </Willow>
                </Locale>
                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        onAction={handleContextMenuAction}
                    />
                )}
                {editingTask && (
                    <TaskDetailModal
                        task={editingTask}
                        allTasks={tasks}
                        links={links}
                        onClose={() => setEditingTask(null)}
                        onSave={async (updatedTask) => {
                            await handleTaskUpdate(updatedTask);
                            setEditingTask(null);
                        }}
                        onDelete={async (taskId) => {
                            await handleTaskDelete(taskId);
                            setEditingTask(null);
                        }}
                        onLinkCreate={handleLinkCreate}
                        onLinkDelete={handleLinkDelete}
                        onLinkUpdate={handleLinkUpdate}
                    />
                )}
            </div>
        </div >
    );
}
