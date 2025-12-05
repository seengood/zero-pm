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

    // Observer instances
    const observersRef = useRef(null);

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

    // Initialize observers
    useEffect(() => {
        console.log('[GanttView] Initializing observers...');

        // Create observer instances
        const dbObserver = new DBObserver();
        const uiObserver = new UIObserver(setTasks, setEditingTask, setLinks);

        // ScheduleObserver will call recalculateAffectedTasks directly
        // This ensures it always uses the latest tasks/links state
        const scheduleObserver = new ScheduleObserver(
            () => tasksRef.current,
            () => linksRef.current,
            async (task, updates) => {
                // This will emit task:updated event
                taskEventEmitter.emit('task:updated', {
                    task,
                    updates,
                    changesAffectSchedule: true
                });
            },
            recalculateAffectedTasks // Pass the function directly
        );

        console.log('[GanttView] Observers created:', { dbObserver, uiObserver, scheduleObserver });

        // Store for later use
        observersRef.current = {
            db: dbObserver,
            ui: uiObserver,
            schedule: scheduleObserver
        };

        // Register event listeners
        const unsubscribers = [
            taskEventEmitter.on('task:updated', (event) => {
                console.log('[GanttView] task:updated event received:', event);
                dbObserver.handleTaskUpdated(event);
                uiObserver.handleTaskUpdated(event);
            }),
            taskEventEmitter.on('task:created', async (event) => {
                console.log('[GanttView] task:created event received:', event);
                await dbObserver.handleTaskCreated(event);
                await uiObserver.handleTaskCreated(event);
            }),
            taskEventEmitter.on('task:deleted', async (event) => {
                console.log('[GanttView] task:deleted event received:', event);
                await dbObserver.handleTaskDeleted(event);
                await uiObserver.handleTaskDeleted(event);
            }),
            taskEventEmitter.on('link:created', async (event) => {
                console.log('[GanttView] link:created event received:', event);
                await dbObserver.handleLinkCreated(event);
                await uiObserver.handleLinkCreated(event);
                await scheduleObserver.handleLinkCreated(event);
            }),
            taskEventEmitter.on('link:updated', async (event) => {
                console.log('[GanttView] link:updated event received:', event);
                await dbObserver.handleLinkUpdated(event);
                await uiObserver.handleLinkUpdated(event);
                await scheduleObserver.handleLinkUpdated(event);
            }),
            taskEventEmitter.on('link:deleted', async (event) => {
                console.log('[GanttView] link:deleted event received:', event);
                await dbObserver.handleLinkDeleted(event);
                await uiObserver.handleLinkDeleted(event);
                await scheduleObserver.handleLinkDeleted(event);
            })
        ];

        console.log('[GanttView] Event listeners registered');

        // Cleanup on unmount
        return () => {
            console.log('[GanttView] Cleaning up observers');
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

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
        console.log('[handleTaskUpdate] Called with task:', task);

        // Get the current task from state (use ref for latest state)
        const currentTask = tasksRef.current.find(t => String(t.id) === String(task.id));
        if (!currentTask) {
            console.error('Task not found:', task.id);
            return null;
        }

        console.log('[handleTaskUpdate] Current task found:', currentTask);

        // Merge current task with updates
        let mergedTask = { ...currentTask, ...task };

        // Calculate duration if start and/or end are provided (from drag)
        // BUT skip if duration is already explicitly set (from diff calculation)
        if (task.duration === undefined) {
            if (task.start && task.end) {
                // Both start and end provided
                const startDate = parseToUTC(task.start);
                const endDate = parseToUTC(task.end);
                const durationInMs = endDate - startDate;
                const durationInDays = Math.ceil(durationInMs / (1000 * 60 * 60 * 24));
                mergedTask.duration = durationInDays;
                console.log(`Calculated duration from drag (both): ${durationInDays} days`);
            } else if (task.end && currentTask.start_date) {
                // Only end provided, use current start_date
                const startDate = parseToUTC(currentTask.start_date);
                const endDate = parseToUTC(task.end);
                console.log('[handleTaskUpdate] End date calculation:', {
                    currentStartDate: currentTask.start_date,
                    taskEnd: task.end,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                });
                const durationInMs = endDate - startDate;
                const durationInDays = Math.ceil(durationInMs / (1000 * 60 * 60 * 24));
                mergedTask.duration = durationInDays;
                console.log(`Calculated duration from drag (end only): ${durationInDays} days (${durationInMs}ms)`);
            } else if (task.start && currentTask.duration) {
                // Only start provided, keep current duration
                console.log(`Using existing duration: ${currentTask.duration} days`);
            }
        } else {
            console.log(`Duration already set to ${task.duration}, skipping calculation`);
        }

        console.log('[handleTaskUpdate] Merged task:', mergedTask);

        // Normalize and validate the merged task
        mergedTask = normalizeTask(mergedTask);
        try {
            validateTask(mergedTask);
        } catch (error) {
            console.error('Task validation failed:', error);
            return null;
        }

        console.log('[handleTaskUpdate] Task validated and normalized');

        // Prepare updates for database (only changed fields)
        const updates = {};
        if (task.text !== undefined) updates.text = task.text;
        if (task.start !== undefined) updates.start_date = toISOString(task.start);
        if (task.start_date !== undefined) updates.start_date = mergedTask.start_date;

        console.log('[handleTaskUpdate] Duration check:', {
            mergedDuration: mergedTask.duration,
            currentDuration: currentTask.duration,
            areEqual: mergedTask.duration === currentTask.duration,
            mergedType: typeof mergedTask.duration,
            currentType: typeof currentTask.duration
        });

        if (mergedTask.duration !== currentTask.duration) {
            updates.duration = mergedTask.duration;
            console.log('[handleTaskUpdate] Duration changed, adding to updates');
        }

        if (task.parent !== undefined) updates.parent_id = task.parent ? String(task.parent) : null;
        if (task.progress !== undefined) updates.progress = mergedTask.progress;
        if (task.type !== undefined) updates.type = task.type;
        if (task.description !== undefined) updates.description = task.description;
        if (task.constraint_type !== undefined) updates.constraint_type = task.constraint_type;
        if (task.constraint_date !== undefined) updates.constraint_date = task.constraint_date ? toISOString(task.constraint_date) : null;

        console.log('[handleTaskUpdate] Updates prepared:', updates);

        // Determine if changes affect schedule
        const changesAffectSchedule = task.start !== undefined || task.duration !== undefined || task.start_date !== undefined;

        // Check if there are any updates to save
        if (Object.keys(updates).length === 0) {
            console.log('[handleTaskUpdate] No changes to save to database, skipping DB update');

            // Still emit event for UI update
            console.log('[handleTaskUpdate] Emitting task:updated event for UI only');

            await taskEventEmitter.emit('task:updated', {
                task: mergedTask,
                updates: {},
                changesAffectSchedule
            });

            // Handle schedule recalculation if needed (skip if called from auto-scheduling)
            if (changesAffectSchedule && !skipRecalculation) {
                await recalculateAffectedTasks(task.id, mergedTask);
            }

            return mergedTask;
        }

        console.log('[handleTaskUpdate] Emitting task:updated event for:', task.id);

        // Emit event - observers will handle DB save, UI update, and recalculation
        await taskEventEmitter.emit('task:updated', {
            task: mergedTask,
            updates,
            changesAffectSchedule
        });

        console.log('[handleTaskUpdate] Event emitted successfully');

        // Handle schedule recalculation separately (not yet in observer)
        if (changesAffectSchedule) {
            await recalculateAffectedTasks(task.id, mergedTask);
        }

        return mergedTask;
    };

    // Create recalculateAffectedTasks function using factory pattern
    // (Must be after handleTaskUpdate definition)
    const recalculateAffectedTasks = createRecalculateFunction({
        tasksRef,
        linksRef,
        handleTaskUpdate,
        toISOString
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
                                // Intercept resize-task action (triggered by resizing bars)
                                api.intercept("resize-task", async (params) => {
                                    console.log('[Gantt] Intercepted resize-task:', params);

                                    const taskId = params.id;
                                    const changes = params.task || {};
                                    const diff = params.diff || 0;

                                    console.log('[Gantt] Resize - Task ID:', taskId, 'Changes:', changes, 'Diff:', diff);

                                    // Apply diff to duration
                                    if (diff !== 0) {
                                        const currentTask = tasks.find(t => String(t.id) === String(taskId));
                                        if (currentTask) {
                                            const newDuration = (currentTask.duration || 0) + diff;
                                            console.log('[Gantt] Resize - Applying diff:', diff, 'Old duration:', currentTask.duration, 'New duration:', newDuration);
                                            changes.duration = newDuration;
                                        }
                                    }

                                    await handleTaskUpdate({ id: taskId, ...changes });
                                    return params;
                                });

                                // Intercept update-task action (triggered by dragging bars)
                                api.intercept("update-task", async (params) => {
                                    console.log('[Gantt] Intercepted update-task:', params);

                                    // params contains: { id, task (changes), diff }
                                    // diff = number of days the task was moved/resized
                                    const taskId = params.id;
                                    const changes = params.task || {};
                                    const diff = params.diff || 0;

                                    console.log('[Gantt] Task ID:', taskId, 'Changes:', changes, 'Diff:', diff);

                                    // If diff is present, it means duration changed by dragging
                                    // Apply the diff to the current duration
                                    if (diff !== 0) {
                                        const currentTask = tasks.find(t => String(t.id) === String(taskId));
                                        if (currentTask) {
                                            const newDuration = (currentTask.duration || 0) + diff;
                                            console.log('[Gantt] Applying diff:', diff, 'Old duration:', currentTask.duration, 'New duration:', newDuration);
                                            changes.duration = newDuration;
                                        }
                                    }

                                    // Call handleTaskUpdate with id and changes
                                    await handleTaskUpdate({ id: taskId, ...changes });

                                    return params;
                                }); // Intercept add-link action to save to database
                                // Intercept add-link action (triggered by UI link creation)
                                api.intercept("add-link", async (params) => {
                                    console.log('[Gantt] Intercepted add-link:', params);

                                    const linkData = params.link || params;
                                    const newLink = {
                                        project_id: projectId,
                                        source: String(linkData.source),
                                        target: String(linkData.target),
                                        type: linkData.type || 'e2s',
                                        lag: linkData.lag || 0
                                    };

                                    // Emit link:created event (DB save + UI update + auto-schedule)
                                    taskEventEmitter.emit('link:created', {
                                        link: newLink
                                    });

                                    // Return params to allow Gantt to proceed
                                    return params;
                                });

                                // Intercept update-link action (triggered by UI link modification)
                                api.intercept("update-link", async (params) => {
                                    console.log('[Gantt] Intercepted update-link:', params);

                                    const linkId = params.id;
                                    const updates = params.link || {};

                                    // Find current link
                                    const currentLink = links.find(l => String(l.id) === String(linkId));
                                    if (currentLink) {
                                        const updatedLink = { ...currentLink, ...updates };

                                        // Emit link:updated event
                                        taskEventEmitter.emit('link:updated', {
                                            link: updatedLink,
                                            updates
                                        });
                                    }

                                    return params;
                                });

                                // Intercept delete-link action (triggered by UI link deletion)
                                api.intercept("delete-link", async (params) => {
                                    console.log('[Gantt] Intercepted delete-link:', params);

                                    const linkId = params.id;

                                    // Find the link before deletion for recalculation
                                    const link = links.find(l => String(l.id) === String(linkId));

                                    // Emit link:deleted event
                                    taskEventEmitter.emit('link:deleted', {
                                        linkId,
                                        link
                                    });

                                    return params;
                                });
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
