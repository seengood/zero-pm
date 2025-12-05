import React from 'react';

export const Gantt = ({ tasks }) => (
    <div data-testid="mock-gantt">
        {tasks.map(t => (
            <div key={t.id} data-testid={`task-${t.id}`}>
                {t.text} - {t.start_date}
            </div>
        ))}
    </div>
);

export const Willow = ({ children }) => <div>{children}</div>;
