export const ko = {
    // Calendar
    calendar: {
        monthFull: [
            "1월", "2월", "3월", "4월", "5월", "6월",
            "7월", "8월", "9월", "10월", "11월", "12월"
        ],
        monthShort: [
            "1월", "2월", "3월", "4월", "5월", "6월",
            "7월", "8월", "9월", "10월", "11월", "12월"
        ],
        dayFull: [
            "일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"
        ],
        dayShort: ["일", "월", "화", "수", "목", "금", "토"],
        hours: "시간",
        minutes: "분",
        done: "완료",
        clear: "지우기",
        today: "오늘",
        am: ["오전", "오전"],
        pm: ["오후", "오후"],
        weekStart: 0, // 한국은 일요일 시작
        clockFormat: 24
    },

    // Core
    core: {
        ok: "확인",
        cancel: "취소",
        select: "선택",
        "No data": "데이터 없음"
    },

    // Formats - 한국 날짜 형식 (YYYY-MM-DD)
    formats: {
        dateFormat: "%Y-%m-%d",
        timeFormat: "%H:%i",
        monthYearFormat: "%Y-%m",
        yearFormat: "%Y",
    },

    lang: "ko-KR",

    // Gantt
    gantt: {
        // Column headers
        text: "작업명",
        start: "시작일",
        duration: "기간",

        // Header / sidebar
        "Task name": "작업명",
        "Start date": "시작일",
        Duration: "기간",
        Task: "작업",
        Milestone: "마일스톤",
        "Summary task": "요약 작업",

        // Sidebar
        Save: "저장",
        Delete: "삭제",
        Name: "이름",
        Description: "설명",
        "Select type": "유형 선택",
        Type: "유형",
        "End date": "종료일",
        Progress: "진행률",
        Predecessors: "선행 작업",
        Successors: "후속 작업",
        "Add task name": "작업명 추가",
        "Add description": "설명 추가",
        "Select link type": "연결 유형 선택",
        "End-to-start": "종료-시작",
        "Start-to-start": "시작-시작",
        "End-to-end": "종료-종료",
        "Start-to-end": "시작-종료",

        // Context menu / toolbar
        Add: "추가",
        "Child task": "하위 작업",
        "Task above": "위에 작업",
        "Task below": "아래에 작업",
        "Convert to": "변환",
        Edit: "편집",
        Cut: "잘라내기",
        Copy: "복사",
        Paste: "붙여넣기",
        Move: "이동",
        Up: "위로",
        Down: "아래로",
        Indent: "들여쓰기",
        Outdent: "내어쓰기",
        "Split task": "작업 분할",

        // Toolbar
        "New task": "새 작업",
        "Move up": "위로 이동",
        "Move down": "아래로 이동"
    }
};
