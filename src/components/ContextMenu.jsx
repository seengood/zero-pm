import React, { useEffect, useRef } from 'react';

export default function ContextMenu({ x, y, onClose, onAction }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const style = {
        position: 'fixed',
        top: y,
        left: x,
        backgroundColor: 'white',
        border: '1px solid #eaeaea',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '0.5rem 0',
        zIndex: 1000,
        minWidth: '160px',
        fontFamily: 'var(--wx-font-family, sans-serif)',
        fontSize: 'var(--wx-font-size, 14px)',
        color: 'var(--wx-color-font, #333)',
    };

    const itemStyle = {
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'background-color 0.2s',
    };

    const handleMouseEnter = (e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
    };

    const handleMouseLeave = (e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
    };

    return (
        <div ref={menuRef} style={style}>
            <div
                style={itemStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => onAction('edit')}
            >
                수정
            </div>
            <div
                style={itemStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => onAction('add-sibling')}
            >
                형제 작업 추가
            </div>
            <div
                style={itemStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => onAction('add-child')}
            >
                하위 작업 추가
            </div>
            <div style={{ height: '1px', backgroundColor: '#eaeaea', margin: '0.25rem 0' }} />
            <div
                style={{ ...itemStyle, color: '#ef4444' }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => onAction('delete')}
            >
                삭제
            </div>
        </div>
    );
}
