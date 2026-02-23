/**
 * useTcgSocket — React hook for WebSocket TCG game communication
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001';

export default function useTcgSocket(walletAddress, onTcgAction, onGameOver, onLog) {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [playerNum, setPlayerNum] = useState(null);
    const [opponentAddress, setOpponentAddress] = useState(null);
    const [opponentReady, setOpponentReady] = useState(false);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [battleStarted, setBattleStarted] = useState(false);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [connectionKey, setConnectionKey] = useState(0);

    const onTcgActionRef = useRef(onTcgAction);
    const onGameOverRef = useRef(onGameOver);
    const onLogRef = useRef(onLog);

    useEffect(() => { onTcgActionRef.current = onTcgAction; }, [onTcgAction]);
    useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);
    useEffect(() => { onLogRef.current = onLog; }, [onLog]);

    useEffect(() => {
        if (!walletAddress) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            ws.send(JSON.stringify({ type: 'join', address: walletAddress }));
            onLogRef.current?.('[WS] Connected to game server', 'info');
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
                case 'joined':
                    setPlayerNum(msg.playerNum);
                    onLogRef.current?.(`[WS] Joined as Player ${msg.playerNum}`, 'info');
                    break;

                case 'opponent_joined':
                    setOpponentAddress(msg.opponentAddress);
                    onLogRef.current?.(`[WS] Opponent joined: ${msg.opponentAddress.substring(0, 8)}...`, 'info');
                    break;

                case 'opponent_ready':
                    setOpponentReady(true);
                    onLogRef.current?.('[WS] Opponent committed their deck', 'info');
                    break;

                case 'battle_start':
                    setBattleStarted(true);
                    setIsMyTurn(msg.yourTurn);
                    onLogRef.current?.(`[WS] Battle started! ${msg.yourTurn ? 'Your turn first!' : 'Opponent goes first'}`, 'info');
                    break;

                case 'turn_update':
                    setIsMyTurn(msg.yourTurn);
                    break;

                case 'tcg_action':
                    // e.g. action: 'play_card', payload: { card: {...} }
                    onTcgActionRef.current?.(msg.action, msg.payload);
                    break;

                case 'opponent_disconnected':
                    setOpponentDisconnected(true);
                    onLogRef.current?.('[WS] Opponent disconnected — you win by forfeit!', 'hit');
                    onGameOverRef.current?.('You');
                    break;

                case 'error':
                    onLogRef.current?.(`[WS] Error: ${msg.message}`, 'hit');
                    break;

                case 'you_lost':
                    onLogRef.current?.('[WS] Opponent won the game!', 'hit');
                    onGameOverRef.current?.('Opponent');
                    break;
            }
        };

        ws.onclose = () => {
            setConnected(false);
            onLogRef.current?.('[WS] Disconnected from game server', 'miss');
        };

        ws.onerror = () => {
            onLogRef.current?.('[WS] Game server not running', 'hit');
        };

        return () => {
            ws.close();
        };
    }, [walletAddress, connectionKey]);

    const sendTcgAction = useCallback((action, payload) => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'tcg_action', action, payload }));
        }
    }, []);

    const notifyDeckCommitted = useCallback(() => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'board_committed' }));
        }
    }, []);

    const passTurn = useCallback(() => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'pass_turn' }));
        }
    }, []);

    const sendGameOver = useCallback(() => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'game_over' }));
        }
    }, []);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
        setPlayerNum(null);
        setOpponentAddress(null);
        setOpponentReady(false);
        setIsMyTurn(false);
        setBattleStarted(false);
        setOpponentDisconnected(false);
        setConnectionKey(prev => prev + 1);
    }, []);

    return {
        connected,
        playerNum,
        opponentAddress,
        opponentReady,
        isMyTurn,
        battleStarted,
        opponentDisconnected,
        sendTcgAction,
        notifyDeckCommitted,
        passTurn,
        sendGameOver,
        disconnect,
    };
}
