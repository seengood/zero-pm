import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Calendar, Clock, Percent, Link as LinkIcon, Edit2, Check } from 'lucide-react';

import { LINK_TYPES, LINK_TYPE_LABELS, CONSTRAINT_TYPES, CONSTRAINT_LABELS } from '@/lib/constants';
import { parseToUTC, calculateEndDateUTC, formatDateForDisplay } from '@/lib/dateUtils';
import { applyConstraint } from '@/lib/scheduling';

const LOCAL_LINK_TYPES = {
    '0': LINK_TYPES.FINISH_TO_START,
    '1': LINK_TYPES.START_TO_START,
    '2': LINK_TYPES.FINISH_TO_FINISH,
    '3': LINK_TYPES.START_TO_FINISH,
    [LINK_TYPES.FINISH_TO_START]: LINK_TYPES.FINISH_TO_START,
    [LINK_TYPES.START_TO_START]: LINK_TYPES.START_TO_START,
    [LINK_TYPES.FINISH_TO_FINISH]: LINK_TYPES.FINISH_TO_FINISH,
    [LINK_TYPES.START_TO_FINISH]: LINK_TYPES.START_TO_FINISH
};

export default function TaskDetailModal({
    task,
    allTasks = [],
    links = [],
    onClose,
    onSave,
    onDelete,
    onLinkCreate,
    onLinkDelete,
    onLinkUpdate
}) {
    const [formData, setFormData] = useState({
        text: '',
        description: '',
        start_date: '',
        duration: 1,
        progress: 0,
        type: 'task',
        constraint_type: 'asap',
        constraint_date: ''
    });

    const [showAddPredecessor, setShowAddPredecessor] = useState(false);
    const [showAddSuccessor, setShowAddSuccessor] = useState(false);
    const [selectedTask, setSelectedTask] = useState('');
    const [selectedLinkType, setSelectedLinkType] = useState(LINK_TYPES.FINISH_TO_START);
    const [linkLag, setLinkLag] = useState(0);

    // Editing state
    const [editingLinkId, setEditingLinkId] = useState(null);
    const [editLinkType, setEditLinkType] = useState(LINK_TYPES.FINISH_TO_START);
    const [editLinkLag, setEditLinkLag] = useState(0);

    const ignoreNextTaskUpdate = React.useRef(false);

    // Calculate predecessors and successors
    const { predecessors, successors } = useMemo(() => {
        if (!task) return { predecessors: [], successors: [] };

        const preds = links
            .filter(link => String(link.target) === String(task.id))
            .map(link => {
                const sourceTask = allTasks.find(t => String(t.id) === String(link.source));
                return {
                    ...link,
                    taskName: sourceTask?.text || 'Unknown Task',
                    linkType: LOCAL_LINK_TYPES[link.type] || link.type
                };
            });

        const succs = links
            .filter(link => String(link.source) === String(task.id))
            .map(link => {
                const targetTask = allTasks.find(t => String(t.id) === String(link.target));
                return {
                    ...link,
                    taskName: targetTask?.text || 'Unknown Task',
                    linkType: LOCAL_LINK_TYPES[link.type] || link.type
                };
            });

        return { predecessors: preds, successors: succs };
    }, [task, links, allTasks]);

    // Get available tasks for linking (exclude current task and already linked tasks)
    const getAvailableTasks = (isPredecessor) => {
        if (!task) return [];

        const linkedTaskIds = isPredecessor
            ? predecessors.map(p => p.source)
            : successors.map(s => s.target);

        return allTasks.filter(t =>
            String(t.id) !== String(task.id) &&
            !linkedTaskIds.includes(t.id)
        );
    };

    useEffect(() => {
        if (task) {
            if (ignoreNextTaskUpdate.current) {
                ignoreNextTaskUpdate.current = false;
                return;
            }

            let startDateStr = '';

            const startDate = task.start_date || task.start;
            if (startDate) {
                const date = parseToUTC(startDate);
                if (date) {
                    startDateStr = formatDateForDisplay(date);
                }
            }

            setFormData({
                text: task.text || '',
                description: task.description || '',
                start_date: startDateStr,
                duration: task.duration || 1,
                progress: (task.progress || 0) * 100,
                type: task.type || 'task',
                constraint_type: task.constraint_type || 'asap',
                constraint_date: task.constraint_date ? formatDateForDisplay(task.constraint_date) : ''
            });
        }
    }, [task]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'duration') {
            const duration = Number(value);
            setFormData(prev => ({ ...prev, duration }));
        } else if (name === 'start_date') {
            setFormData(prev => ({ ...prev, start_date: value }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'progress' ? Number(value) : value
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const form = e.target;

        // Get values directly from form elements to ensure we have the latest values
        let updatedTask = {
            ...task,
            text: form.text.value,
            description: form.description.value,
            start_date: new Date(form.start_date.value),
            start: new Date(form.start_date.value),
            duration: Number(form.duration.value),
            progress: Number(form.progress.value) / 100,
            type: form.type.value,
            constraint_type: form.constraint_type.value,
            constraint_date: form.constraint_date?.value || null
        };

        // Apply scheduling constraint to adjust dates
        if (updatedTask.constraint_type && updatedTask.constraint_type !== 'asap') {
            const calculatedStart = parseToUTC(updatedTask.start_date);
            const calculatedEnd = calculateEndDateUTC(calculatedStart, updatedTask.duration);

            const { start, end } = applyConstraint(
                updatedTask,
                calculatedStart,
                calculatedEnd
            );

            // Update start_date based on constraint
            updatedTask.start_date = start;
            updatedTask.start = start;
        }

        onSave(updatedTask);
    };

    const handleAddLink = async (isPredecessor) => {
        if (!selectedTask || !onLinkCreate) return;

        const newLink = {
            source: isPredecessor ? selectedTask : task.id,
            target: isPredecessor ? task.id : selectedTask,
            type: selectedLinkType,
            lag: linkLag || 0
        };

        await onLinkCreate(newLink);

        // Reset form
        setSelectedTask('');
        setSelectedLinkType(LINK_TYPES.FINISH_TO_START);
        setLinkLag(0);
        setShowAddPredecessor(false);
        setShowAddSuccessor(false);
    };

    const handleDeleteLink = async (linkId) => {
        if (!onLinkDelete) return;
        await onLinkDelete(linkId);
    };

    const startEditingLink = (link) => {
        setEditingLinkId(link.id);
        setEditLinkType(link.type);
        setEditLinkLag(link.lag || 0);
    };

    const cancelEditingLink = () => {
        setEditingLinkId(null);
        setEditLinkType(LINK_TYPES.FINISH_TO_START);
        setEditLinkLag(0);
    };

    const handleUpdateLink = async (linkId) => {
        if (!onLinkUpdate) return;

        const updatedTask = await onLinkUpdate(linkId, {
            type: editLinkType,
            lag: editLinkLag
        });

        // If the update triggered an auto-schedule for the current task, update the form data immediately
        // to prevent stale state from overwriting the new dates on save.
        if (updatedTask && String(updatedTask.id) === String(task.id)) {
            const startDateStr = updatedTask.start_date ? new Date(updatedTask.start_date).toISOString().split('T')[0] : '';
            const endDateStr = updatedTask.end_date ? new Date(updatedTask.end_date).toISOString().split('T')[0] : '';

            ignoreNextTaskUpdate.current = true;
            setFormData(prev => ({
                ...prev,
                start_date: startDateStr,
                end_date: endDateStr,
                duration: updatedTask.duration || prev.duration
            }));
        }

        setEditingLinkId(null);
    };

    if (!task) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000,
            display: 'flex', justifyContent: 'flex-end'
        }} onClick={onClose}>
            <div style={{
                width: '400px', height: '100%', backgroundColor: 'white',
                boxShadow: '-4px 0 10px rgba(0,0,0,0.1)',
                display: 'flex', flexDirection: 'column',
                animation: 'slideIn 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #eee',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                        <X size={20} color="#666" />
                    </button>
                    <button
                        onClick={() => onDelete(task.id)}
                        style={{
                            border: 'none', background: '#ff4d4f', color: 'white',
                            padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 500
                        }}
                    >
                        Delete
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <form id="task-form" onSubmit={handleSubmit}>

                        {/* Task Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                Name
                            </label>
                            <input
                                type="text"
                                name="text"
                                value={formData.text}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px',
                                    fontSize: '14px'
                                }}
                                required
                            />
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Add description"
                                style={{
                                    width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px',
                                    fontSize: '14px', resize: 'vertical', fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Type */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                Type
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px',
                                    fontSize: '14px', backgroundColor: 'white'
                                }}
                            >
                                <option value="task">Task</option>
                                <option value="milestone">Milestone</option>
                                <option value="project">Project</option>
                            </select>
                        </div>

                        {/* Dates */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                Start date
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '8px 10px 8px 30px', border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                                <Calendar size={16} color="#999" style={{ position: 'absolute', left: 10, top: 10 }} />
                            </div>
                        </div>

                        {/* Scheduling Constraint */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                Scheduling Constraint
                            </label>
                            <select
                                name="constraint_type"
                                value={formData.constraint_type}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px',
                                    fontSize: '14px'
                                }}
                            >
                                {Object.entries(CONSTRAINT_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Constraint Date (show only for specific constraint types) */}
                        {['mso', 'mfo', 'snet', 'fnlt'].includes(formData.constraint_type) && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                    Constraint Date
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        name="constraint_date"
                                        value={formData.constraint_date}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%', padding: '8px 10px 8px 30px', border: '1px solid #ddd', borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                        required
                                    />
                                    <Calendar size={16} color="#999" style={{ position: 'absolute', left: 10, top: 10 }} />
                                </div>
                            </div>
                        )}

                        {/* Duration & Progress */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                    Duration
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'duration', value: Math.max(1, formData.duration - 1) } })}
                                        style={{
                                            padding: '8px', border: '1px solid #ddd', borderRight: 'none',
                                            borderRadius: '4px 0 0 4px', background: '#f5f5f5', cursor: 'pointer'
                                        }}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        name="duration"
                                        value={formData.duration}
                                        onChange={handleChange}
                                        min="1"
                                        style={{
                                            width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '0',
                                            textAlign: 'center', fontSize: '14px'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'duration', value: formData.duration + 1 } })}
                                        style={{
                                            padding: '8px', border: '1px solid #ddd', borderLeft: 'none',
                                            borderRadius: '0 4px 4px 0', background: '#f5f5f5', cursor: 'pointer'
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                                Progress {formData.progress}%
                            </label>
                            <input
                                type="range"
                                name="progress"
                                value={formData.progress}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Dependencies Section */}
                        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <LinkIcon size={16} color="#666" />
                                <label style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                                    Dependencies
                                </label>
                            </div>

                            {/* Predecessors */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                                    Predecessors
                                </div>
                                {predecessors.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {predecessors.map(pred => (
                                            editingLinkId === pred.id ? (
                                                <div key={pred.id} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                    <div style={{ marginBottom: '8px', fontWeight: 600, color: '#333' }}>
                                                        {pred.taskName}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                        <select
                                                            value={editLinkType}
                                                            onChange={(e) => setEditLinkType(e.target.value)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 8px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            <option value={LINK_TYPES.FINISH_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_START]}</option>
                                                            <option value={LINK_TYPES.START_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_START]}</option>
                                                            <option value={LINK_TYPES.FINISH_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_FINISH]}</option>
                                                            <option value={LINK_TYPES.START_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_FINISH]}</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            value={editLinkLag}
                                                            onChange={(e) => setEditLinkLag(Number(e.target.value))}
                                                            placeholder="Lag"
                                                            style={{
                                                                width: '80px',
                                                                padding: '6px 8px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                fontSize: '13px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateLink(pred.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 12px',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                background: '#0070f3',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditingLink}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 12px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                background: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={pred.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    background: '#f5f5f5',
                                                    borderRadius: '4px'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: 500, color: '#333' }}>
                                                            {pred.taskName}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                                                            ({pred.linkType}{pred.lag !== 0 ? `, ${pred.lag > 0 ? '+' : ''}${pred.lag}d` : ''})
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingLink(pred)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#666',
                                                                cursor: 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            title="Edit link"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteLink(pred.id)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#ff4d4f',
                                                                cursor: 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            title="Remove link"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                                        No predecessors
                                    </div>
                                )}

                                {showAddPredecessor ? (
                                    <div style={{ marginTop: '10px', padding: '12px', background: '#f9f9f9', borderRadius: '4px' }}>
                                        <select
                                            value={selectedTask}
                                            onChange={(e) => setSelectedTask(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                marginBottom: '8px',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <option value="">Select task...</option>
                                            {getAvailableTasks(true).map(t => (
                                                <option key={t.id} value={t.id}>{t.text}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <select
                                                value={selectedLinkType}
                                                onChange={(e) => setSelectedLinkType(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 8px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <option value={LINK_TYPES.FINISH_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_START]}</option>
                                                <option value={LINK_TYPES.START_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_START]}</option>
                                                <option value={LINK_TYPES.FINISH_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_FINISH]}</option>
                                                <option value={LINK_TYPES.START_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_FINISH]}</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={linkLag}
                                                onChange={(e) => setLinkLag(Number(e.target.value))}
                                                placeholder="Lag (days)"
                                                style={{
                                                    width: '80px',
                                                    padding: '6px 8px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleAddLink(true)}
                                                disabled={!selectedTask}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 12px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    background: selectedTask ? '#0070f3' : '#ccc',
                                                    color: 'white',
                                                    cursor: selectedTask ? 'pointer' : 'not-allowed',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddPredecessor(false);
                                                    setSelectedTask('');
                                                    setSelectedLinkType(LINK_TYPES.FINISH_TO_START);
                                                    setLinkLag(0);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 12px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPredecessor(true)}
                                        style={{
                                            marginTop: '8px',
                                            padding: '6px 12px',
                                            border: '1px dashed #ddd',
                                            borderRadius: '4px',
                                            background: 'white',
                                            color: '#666',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            width: '100%'
                                        }}
                                    >
                                        + Add Predecessor
                                    </button>
                                )}
                            </div>

                            {/* Successors */}
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                                    Successors
                                </div>
                                {successors.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {successors.map(succ => (
                                            editingLinkId === succ.id ? (
                                                <div key={succ.id} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                    <div style={{ marginBottom: '8px', fontWeight: 600, color: '#333' }}>
                                                        {succ.taskName}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                        <select
                                                            value={editLinkType}
                                                            onChange={(e) => setEditLinkType(e.target.value)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 8px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            <option value={LINK_TYPES.FINISH_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_START]}</option>
                                                            <option value={LINK_TYPES.START_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_START]}</option>
                                                            <option value={LINK_TYPES.FINISH_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_FINISH]}</option>
                                                            <option value={LINK_TYPES.START_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_FINISH]}</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            value={editLinkLag}
                                                            onChange={(e) => setEditLinkLag(Number(e.target.value))}
                                                            placeholder="Lag"
                                                            style={{
                                                                width: '80px',
                                                                padding: '6px 8px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                fontSize: '13px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateLink(succ.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 12px',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                background: '#0070f3',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditingLink}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 12px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                background: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={succ.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    background: '#f5f5f5',
                                                    borderRadius: '4px'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: 500, color: '#333' }}>
                                                            {succ.taskName}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                                                            ({succ.linkType}{succ.lag !== 0 ? `, ${succ.lag > 0 ? '+' : ''}${succ.lag}d` : ''})
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingLink(succ)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#666',
                                                                cursor: 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            title="Edit link"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteLink(succ.id)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#ff4d4f',
                                                                cursor: 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            title="Remove link"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                                        No successors
                                    </div>
                                )}

                                {showAddSuccessor ? (
                                    <div style={{ marginTop: '10px', padding: '12px', background: '#f9f9f9', borderRadius: '4px' }}>
                                        <select
                                            value={selectedTask}
                                            onChange={(e) => setSelectedTask(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                marginBottom: '8px',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <option value="">Select task...</option>
                                            {getAvailableTasks(false).map(t => (
                                                <option key={t.id} value={t.id}>{t.text}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <select
                                                value={selectedLinkType}
                                                onChange={(e) => setSelectedLinkType(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 8px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <option value={LINK_TYPES.FINISH_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_START]}</option>
                                                <option value={LINK_TYPES.START_TO_START}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_START]}</option>
                                                <option value={LINK_TYPES.FINISH_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.FINISH_TO_FINISH]}</option>
                                                <option value={LINK_TYPES.START_TO_FINISH}>{LINK_TYPE_LABELS[LINK_TYPES.START_TO_FINISH]}</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={linkLag}
                                                onChange={(e) => setLinkLag(Number(e.target.value))}
                                                placeholder="Lag (days)"
                                                style={{
                                                    width: '80px',
                                                    padding: '6px 8px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleAddLink(false)}
                                                disabled={!selectedTask}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 12px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    background: selectedTask ? '#0070f3' : '#ccc',
                                                    color: 'white',
                                                    cursor: selectedTask ? 'pointer' : 'not-allowed',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddSuccessor(false);
                                                    setSelectedTask('');
                                                    setSelectedLinkType(LINK_TYPES.FINISH_TO_START);
                                                    setLinkLag(0);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 12px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddSuccessor(true)}
                                        style={{
                                            marginTop: '8px',
                                            padding: '6px 12px',
                                            border: '1px dashed #ddd',
                                            borderRadius: '4px',
                                            background: 'white',
                                            color: '#666',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            width: '100%'
                                        }}
                                    >
                                        + Add Successor
                                    </button>
                                )}
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px', borderTop: '1px solid #eee',
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px',
                            backgroundColor: 'white', cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="task-form"
                        style={{
                            padding: '8px 16px', border: 'none', borderRadius: '4px',
                            backgroundColor: '#0070f3', color: 'white', cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
