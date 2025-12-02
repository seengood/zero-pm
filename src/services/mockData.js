export const mockTasks = [
    {
        id: 1,
        text: "Zero-PM Project",
        start: "2024-11-01",
        end: "2025-05-30",
        duration: 180,
        progress: 0,
        type: "project",
        open: true
    },
    {
        id: 2,
        text: "Phase 1: Planning",
        start: "2024-11-01",
        end: "2024-11-30",
        duration: 30,
        progress: 50,
        parent: 1,
        type: "summary",
        open: true
    },
    {
        id: 3,
        text: "Requirements Analysis",
        start: "2024-11-01",
        end: "2024-11-15",
        duration: 15,
        progress: 100,
        parent: 2,
        type: "task"
    },
    {
        id: 4,
        text: "Architecture Design",
        start: "2024-11-16",
        end: "2024-11-30",
        duration: 15,
        progress: 0,
        parent: 2,
        type: "task"
    },
    {
        id: 5,
        text: "Phase 2: Implementation",
        start: "2024-12-01",
        end: "2025-03-31",
        duration: 90,
        progress: 0,
        parent: 1,
        type: "summary",
        open: true
    },
    {
        id: 6,
        text: "Frontend Development",
        start: "2024-12-01",
        end: "2025-02-15",
        duration: 45,
        progress: 0,
        parent: 5,
        type: "task"
    },
    {
        id: 7,
        text: "Backend Development",
        start: "2025-01-01",
        end: "2025-03-31",
        duration: 90,
        progress: 0,
        parent: 5,
        type: "task"
    }
];

export const mockLinks = [
    { id: 1, source: 3, target: 4, type: "e2e" },
    { id: 2, source: 2, target: 5, type: "e2e" },
    { id: 3, source: 6, target: 7, type: "s2s" }
];
