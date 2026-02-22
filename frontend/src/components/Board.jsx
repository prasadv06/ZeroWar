import React from 'react';

/**
 * Board component — renders a 5x5 ZeroWar grid.
 * Used for both placement and shooting phases.
 *
 * Props:
 *  - cells: array of 25 values (0=water, 1=ship, 'hit', 'miss')
 *  - onCellClick: (index) => void
 *  - interactive: boolean
 *  - mode: 'placement' | 'shooting' | 'display'
 *  - label: string header text
 */
export default function Board({ cells, onCellClick, interactive = true, mode = 'display', label = '' }) {
    const getCellClass = (value, index) => {
        const classes = ['grid-cell'];
        if (!interactive) classes.push('disabled');

        if (value === 'hit') {
            classes.push('hit');
        } else if (value === 'miss') {
            classes.push('miss');
        } else if (value === 1 && mode === 'placement') {
            classes.push('ship');
        }

        return classes.join(' ');
    };

    const handleClick = (index) => {
        if (!interactive || !onCellClick) return;
        onCellClick(index);
    };

    const getCoord = (index) => {
        const col = String.fromCharCode(65 + (index % 5));
        const row = Math.floor(index / 5) + 1;
        return `${col}${row}`;
    };

    return (
        <div className="board-panel">
            {label && <div className="board-label">{label}</div>}
            <div className="grid-container">
                {cells.map((cell, idx) => (
                    <div
                        key={idx}
                        className={getCellClass(cell, idx)}
                        onClick={() => handleClick(idx)}
                        title={getCoord(idx)}
                        id={`cell-${label.replace(/\s/g, '-').toLowerCase()}-${idx}`}
                    />
                ))}
            </div>
        </div>
    );
}
