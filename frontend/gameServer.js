/**
 * ZeroWar — WebSocket Game Server
 * 
 * Lightweight relay server for 2-player communication.
 * No board knowledge on server — boards stay secret (ZK model).
 * Players communicate: join, ready, fire, shot_result
 */

import { WebSocketServer } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

// Game state
let players = []; // [{ ws, address, ready }]
let currentTurn = 0; // 0 = player 1's turn, 1 = player 2's turn
let gameStarted = false;

function broadcast(msg, exclude) {
    const data = JSON.stringify(msg);
    for (const p of players) {
        if (p.ws !== exclude && p.ws.readyState === 1) {
            p.ws.send(data);
        }
    }
}

function send(ws, msg) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(msg));
    }
}

function getPlayerIndex(ws) {
    return players.findIndex(p => p.ws === ws);
}

function resetGame() {
    players = [];
    currentTurn = 0;
    gameStarted = false;
    console.log('[Server] Game reset');
}

wss.on('connection', (ws) => {
    console.log('[Server] New connection');

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        switch (msg.type) {
            case 'join': {
                if (players.length >= 2) {
                    // Reset for new game
                    resetGame();
                }
                const playerNum = players.length + 1;
                players.push({ ws, address: msg.address, ready: false });
                console.log(`[Server] Player ${playerNum} joined: ${msg.address}`);

                send(ws, { type: 'joined', playerNum, address: msg.address });

                if (players.length === 2) {
                    // Notify both players
                    send(players[0].ws, {
                        type: 'opponent_joined',
                        opponentAddress: players[1].address
                    });
                    send(players[1].ws, {
                        type: 'opponent_joined',
                        opponentAddress: players[0].address
                    });
                    console.log('[Server] Both players connected');
                }
                break;
            }

            case 'board_committed': {
                const idx = getPlayerIndex(ws);
                if (idx === -1) break;
                players[idx].ready = true;
                console.log(`[Server] Player ${idx + 1} committed board`);

                broadcast({ type: 'opponent_ready' }, ws);

                // If both players joined AND both ready, start the battle
                if (players.length === 2 && players.every(p => p.ready)) {
                    currentTurn = 0;
                    gameStarted = true;
                    send(players[0].ws, { type: 'battle_start', yourTurn: true });
                    send(players[1].ws, { type: 'battle_start', yourTurn: false });
                    console.log('[Server] Battle started! Player 1 goes first');
                }
                break;
            }

            case 'fire': {
                const idx = getPlayerIndex(ws);
                if (idx === -1 || idx !== currentTurn || !gameStarted) {
                    send(ws, { type: 'error', message: 'Not your turn' });
                    break;
                }

                const targetIdx = 1 - idx; // send to opponent
                console.log(`[Server] Player ${idx + 1} fires at cell ${msg.cellIndex}`);
                send(players[targetIdx].ws, {
                    type: 'incoming_shot',
                    cellIndex: msg.cellIndex,
                    fromPlayer: idx + 1
                });
                break;
            }

            case 'shot_result': {
                const idx = getPlayerIndex(ws);
                if (idx === -1) break;

                const shooterIdx = 1 - idx; // send result back to shooter
                console.log(`[Server] Player ${idx + 1} responds: ${msg.hit ? 'HIT' : 'MISS'} at cell ${msg.cellIndex}`);

                send(players[shooterIdx].ws, {
                    type: 'shot_resolved',
                    cellIndex: msg.cellIndex,
                    hit: msg.hit,
                    proof: msg.proof,
                });

                // Switch turns
                currentTurn = 1 - currentTurn;
                send(players[0].ws, { type: 'turn_update', yourTurn: currentTurn === 0 });
                send(players[1].ws, { type: 'turn_update', yourTurn: currentTurn === 1 });
                break;
            }

            case 'game_over': {
                const idx = getPlayerIndex(ws);
                if (idx === -1) break;
                const loserIdx = 1 - idx;
                if (players[loserIdx]) {
                    send(players[loserIdx].ws, { type: 'you_lost', winnerAddress: players[idx].address });
                }
                console.log(`[Server] Player ${idx + 1} won! Notifying opponent.`);
                // Reset game state for next round
                gameStarted = false;
                currentTurn = 0;
                for (const p of players) {
                    p.ready = false;
                }
                break;
            }

            case 'tcg_action': {
                const idx = getPlayerIndex(ws);
                if (idx === -1) break;
                const targetIdx = 1 - idx;
                if (players[targetIdx]) {
                    console.log(`[Server] Player ${idx + 1} sent TCG action: ${msg.action}`);
                    send(players[targetIdx].ws, { type: 'tcg_action', action: msg.action, payload: msg.payload });
                }
                break;
            }

            case 'pass_turn': {
                const idx = getPlayerIndex(ws);
                if (idx === -1) break;
                if (idx !== currentTurn) break; // only active player can pass turn

                console.log(`[Server] Player ${idx + 1} passed their turn.`);
                currentTurn = 1 - currentTurn;
                send(players[0].ws, { type: 'turn_update', yourTurn: currentTurn === 0 });
                send(players[1].ws, { type: 'turn_update', yourTurn: currentTurn === 1 });
                break;
            }
        }
    });

    ws.on('close', () => {
        const idx = getPlayerIndex(ws);
        if (idx !== -1) {
            console.log(`[Server] Player ${idx + 1} disconnected`);
            broadcast({ type: 'opponent_disconnected' }, ws);
            // Reset game state so remaining player or new players can start fresh
            resetGame();
        }
    });
});

console.log(`🎮 ZeroWar Game Server running on ws://localhost:${PORT}`);
