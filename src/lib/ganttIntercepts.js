/**
 * Gantt Intercepts Setup
 * Functions to configure Gantt API intercepts
 */

/**
 * Setup all Gantt API intercepts
 * @param {Object} api - Gantt API object
 * @param {Object} handlers - Handler functions
 * @param {Object} state - Current state
 */
export function setupGanttIntercepts(api, { handleTaskUpdate, taskEventEmitter }, { tasks, links, projectId }) {
    // Intercept resize-task action (triggered by resizing bars)
    api.intercept("resize-task", async (params) => {
        const taskId = params.id;
        const changes = params.task || {};

        console.log('[Gantt] resize-task params:', params);
        console.log('[Gantt] resize-task changes:', changes);

        // Just pass the changes, Observer will handle duration calculation
        await handleTaskUpdate({ id: taskId, ...changes });
        return params;
    });

    // Intercept update-task action (triggered by dragging bars)
    api.intercept("update-task", async (params) => {
        const taskId = params.id;
        const changes = params.task || {};

        // Just pass the changes, Observer will handle duration calculation
        await handleTaskUpdate({ id: taskId, ...changes });
        return params;
    });

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
}
