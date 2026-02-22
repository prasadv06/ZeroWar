/**
 * useGameSocket — React hook for WebSocket game communication
 * 
 * Manages connection to the game relay server and provides
 * methods for 2-player interaction.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001';

export default function useGameSocket(walletAddress, onIncomingShot, onShotResolved, onGameOver, onLog) {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [playerNum, setPlayerNum] = useState(null);
    const [opponentAddress, setOpponentAddress] = useState(null);
    const [opponentReady, setOpponentReady] = useState(false);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [battleStarted, setBattleStarted] = useState(false);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [connectionKey, setConnectionKey] = useState(0);

    // Store callbacks in refs to avoid reconnection cycles
    const onIncomingShotRef = useRef(onIncomingShot);
    const onShotResolvedRef = useRef(onShotResolved);
    const onGameOverRef = useRef(onGameOver);
    const onLogRef = useRef(onLog);

    useEffect(() => { onIncomingShotRef.current = onIncomingShot; }, [onIncomingShot]);
    useEffect(() => { onShotResolvedRef.current = onShotResolved; }, [onShotResolved]);
    useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);
    useEffect(() => { onLogRef.current = onLog; }, [onLog]);

    // Connect to WebSocket
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
                    onLogRef.current?.('[WS] Opponent committed their board', 'info');
                    break;

                case 'battle_start':
                    setBattleStarted(true);
                    setIsMyTurn(msg.yourTurn);
                    onLogRef.current?.(`[WS] Battle started! ${msg.yourTurn ? 'Your turn first!' : 'Opponent goes first'}`, 'info');
                    break;

                case 'incoming_shot':
                    onLogRef.current?.(`[WS] Incoming shot at cell ${msg.cellIndex}`, 'hit');
                    onIncomingShotRef.current?.(msg.cellIndex);
                    break;

                case 'shot_resolved':
                    onLogRef.current?.(`[WS] Shot result: ${msg.hit ? 'HIT!' : 'Miss'}`, msg.hit ? 'hit' : 'miss');
                    onShotResolvedRef.current?.(msg.cellIndex, msg.hit);
                    break;

                case 'turn_update':
                    setIsMyTurn(msg.yourTurn);
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
            onLogRef.current?.('[WS] Game server not running (start with: node gameServer.js)', 'hit');
        };

        return () => {
            ws.close();
        };
    }, [walletAddress, connectionKey]);

    // Send fire message
    const fire = useCallback((cellIndex) => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'fire', cellIndex }));
        }
    }, []);

    // Send shot result back to opponent
    const sendShotResult = useCallback((cellIndex, hit, proof) => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'shot_result', cellIndex, hit, proof }));
        }
    }, []);

    // Notify board committed
    const notifyBoardCommitted = useCallback(() => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'board_committed' }));
        }
    }, []);

    // Notify that this player won
    const sendGameOver = useCallback(() => {
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'game_over' }));
        }
    }, []);

    // Disconnect and trigger reconnect (for new game reset)
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
        // Increment key to trigger reconnection in useEffect
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
        fire,
        sendShotResult,
        notifyBoardCommitted,
        sendGameOver,
        disconnect,
    };
}
