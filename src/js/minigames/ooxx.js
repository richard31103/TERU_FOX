export const OOXX_AI = "X";
export const OOXX_HU = "O";

export const OOXX_SVG = {
    X: `<svg viewBox="0 0 40 40"><line x1="10" y1="10" x2="30" y2="30"/><line x1="30" y1="10" x2="10" y2="30"/></svg>`,
    O: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12"/></svg>`,
};

export function checkOOXX(board) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for (const line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line };
        }
    }
    return null;
}

function minimax(board, isMaximizing) {
    const outcome = checkOOXX(board);
    if (outcome) return outcome.winner === OOXX_AI ? 10 : -10;
    if (board.every((cell) => cell)) return 0;

    let best = isMaximizing ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = isMaximizing ? OOXX_AI : OOXX_HU;
        const score = minimax(board, !isMaximizing);
        board[i] = "";
        best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
}

export function getBestOOXX(board) {
    // Opening move optimization: avoid full minimax on empty board.
    if (board.every((cell) => !cell)) {
        return 4;
    }

    let bestScore = -Infinity;
    let bestMove = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = OOXX_AI;
        const score = minimax(board, false);
        board[i] = "";
        if (score > bestScore) {
            bestScore = score;
            bestMove = i;
        }
    }
    return bestMove;
}

export function renderOOXXBoard({ board, highlightLine, cellElements }) {
    cellElements.forEach((cell, i) => {
        cell.className = "ooxx-cell";
        cell.innerHTML = board[i] ? OOXX_SVG[board[i]] : "";
        if (board[i]) cell.classList.add("taken", board[i]);
        if (highlightLine && highlightLine.includes(i)) cell.classList.add("win-line");
    });
}
