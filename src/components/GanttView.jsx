'use client';

import React, { useState, useEffect } from 'react';
import { Gantt, Willow } from "@svar-ui/react-gantt";
import { Locale } from "@svar-ui/react-core";
import "@/styles/gantt-svar.css";
import { ko } from "@/locales/ko.js";

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

export default function GanttView({ tasks, links }) {
    const [mounted, setMounted] = useState(false);

    // 날짜 문자열을 Date 객체로 변환하고 표시용 문자열 추가
    const processedTasks = React.useMemo(() => {
        return tasks.map(task => {
            const startDate = new Date(task.start);
            const endDate = task.end ? new Date(task.end) : undefined;

            // 시작일을 YYYY-MM-DD 형식 문자열로 저장
            let startDateStr = "";
            if (!isNaN(startDate.getTime())) {
                const year = startDate.getFullYear();
                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                const day = String(startDate.getDate()).padStart(2, '0');
                startDateStr = `${year}-${month}-${day}`;
            }

            return {
                ...task,
                start: startDate,
                end: endDate,
                start_date: startDateStr
            };
        });
    }, [tasks]);

    const columns = [
        { id: "text", header: { text: "작업명" }, width: 200, tree: true },
        { id: "start_date", header: { text: "시작일" }, align: "center", width: 100 },
        { id: "duration", header: { text: "기간" }, align: "center", width: 60 },
        { id: "add-col", header: { text: "" }, width: 40 }
    ];

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="gantt-container">Loading...</div>;
    }

    return (
        <div className="gantt-container">
            <Locale words={ko}>
                <Willow>
                    <Gantt
                        tasks={processedTasks}
                        links={links}
                        scales={scales}
                        columns={columns}
                    />
                </Willow>
            </Locale>
        </div>
    );
}
