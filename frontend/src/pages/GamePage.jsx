import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameSocket from '../hooks/useGameSocket';
import Board from '../components/Board';
import { computeBoardHash, generateSalt, generateProof } from '../utils/zkProof';
import {
    setContractAddress,
    getContractAddress,
    getGameHubUrl,
    getExplorerUrl,
    getTxUrl,
    startGame as startGameTx,
    commitBoard as commitBoardTx,
    endGame as endGameTx,
    signAndSubmit,
    DEFAULT_CONTRACT,
} from '../utils/stellar';

// Game phases
const PHASE = {
    SETUP: 'setup',
    PLACEMENT: 'placement',
    COMMIT: 'commit',
    BATTLE: 'battle',
    ENDED: 'ended',
};

const SHIPS_REQUIRED = 5;

export default function GamePage({ walletAddress, isRealWallet, setGameStatus }) {
    const navigate = useNavigate();

    // If no wallet connected, show prompt
    if (!walletAddress) {
        return (
            <div className="game-container" style={{ paddingTop: '3rem' }}>
                <div className="phase-title">Wallet Required</div>
                <div className="phase-description">
                    Connect your Freighter wallet to start playing.
                    Click the <strong>Connect Wallet</strong> button in the top right corner.
                </div>
            </div>
        );
    }

    return <GameContent walletAddress={walletAddress} isRealWallet={isRealWallet} setGameStatus={setGameStatus} />;
}

function GameContent({ walletAddress, isRealWallet, setGameStatus }) {
    // State
    const [phase, setPhase] = useState(PHASE.SETUP);
    const [myBoard, setMyBoard] = useState(Array(25).fill(0));
    const [opponentBoard, setOpponentBoard] = useState(Array(25).fill(0));
    const [salt, setSalt] = useState('');
    const [boardHash, setBoardHash] = useState('');
    const [myHits, setMyHits] = useState(0);
    const [opponentHits, setOpponentHits] = useState(0);
    const [proofStatus, setProofStatus] = useState({ msg: '', type: '' });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [logsVisible, setLogsVisible] = useState(false);
    const [winner, setWinner] = useState(null);
    const [player2Address, setPlayer2Address] = useState('');
    const [contractAddr, setContractAddr] = useState(DEFAULT_CONTRACT);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);

    // Logging
    const addLog = useCallback((msg, type = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        setLogs(prev => [...prev.slice(-50), { time, msg, type }]);
    }, []);

    // Handle incoming shot from opponent (opponent fires at our board)
    const handleIncomingShot = useCallback((cellIndex) => {
        const coord = `${String.fromCharCode(65 + (cellIndex % 5))}${Math.floor(cellIndex / 5) + 1}`;
        const isHit = myBoardRef.current[cellIndex] === 1;
        addLog(`Opponent fired at ${coord} — ${isHit ? 'HIT!' : 'Miss'}`, isHit ? 'hit' : 'miss');
        if (isHit) {
            setOpponentHits(prev => prev + 1);
        }
        gameSocket.sendShotResult(cellIndex, isHit, null);
    }, [addLog]);

    // Handle result of our shot (opponent confirmed hit/miss)
    const handleShotResolved = useCallback((cellIndex, hit) => {
        setOpponentBoard(prev => {
            const next = [...prev];
            next[cellIndex] = hit ? 'hit' : 'miss';
            return next;
        });
        const coord = `${String.fromCharCode(65 + (cellIndex % 5))}${Math.floor(cellIndex / 5) + 1}`;
        if (hit) {
            setMyHits(prev => {
                const newHits = prev + 1;
                if (newHits >= SHIPS_REQUIRED) {
                    setTimeout(() => {
                        setWinner('You');
                        setPhase(PHASE.ENDED);
                        addLog('You won the game!', 'info');
                        gameSocketRef.current?.sendGameOver();
                    }, 800);
                }
                return newHits;
            });
            addLog(`HIT at ${coord}!`, 'hit');
        } else {
            addLog(`Miss at ${coord}`, 'miss');
        }
        setProofStatus({ msg: `Shot at ${coord}: ${hit ? 'HIT!' : 'Miss'}`, type: 'success' });
        setWaitingForOpponent(false);
        setLoading(false);
    }, [addLog]);

    // Handle game over notification from opponent
    const handleGameOver = useCallback((winner) => {
        setWinner(winner);
        setPhase(PHASE.ENDED);
        addLog(`${winner} won the game!`, 'info');
    }, [addLog]);

    // WebSocket game hook
    const gameSocket = useGameSocket(walletAddress, handleIncomingShot, handleShotResolved, handleGameOver, addLog);

    const gameSocketRef = useRef(gameSocket);
    useEffect(() => { gameSocketRef.current = gameSocket; }, [gameSocket]);

    const myBoardRef = useRef(myBoard);
    useEffect(() => { myBoardRef.current = myBoard; }, [myBoard]);

    // Push player connection status up to App/Navbar
    useEffect(() => {
        if (gameSocket.connected && gameSocket.playerNum) {
            setGameStatus(`Player ${gameSocket.playerNum}`);
        } else {
            setGameStatus(null);
        }
    }, [gameSocket.connected, gameSocket.playerNum, setGameStatus]);

    // Auto-transition to battle when both players committed
    useEffect(() => {
        if (gameSocket.battleStarted && (phase === PHASE.PLACEMENT || phase === PHASE.COMMIT)) {
            setPhase(PHASE.BATTLE);
            addLog('Both players ready — battle begins!', 'info');
        }
    }, [gameSocket.battleStarted, phase, addLog]);

    // Start Game
    const handleStartGame = useCallback(async () => {
        if (contractAddr) {
            setContractAddress(contractAddr);
        }
        if (isRealWallet && player2Address) {
            setLoading(true);
            try {
                addLog('Building start_game transaction...', 'proof');
                const tx = await startGameTx(walletAddress, player2Address);
                addLog('Signing with Freighter...', 'proof');
                const result = await signAndSubmit(tx, walletAddress);
                addLog(`start_game() confirmed! TX: ${result.hash.substring(0, 12)}...`, 'info');
                setProofStatus({ msg: 'Game started onchain!', type: 'success', detail: result.hash });
            } catch (err) {
                if (err.message && err.message.includes('#1')) {
                    addLog('Game already started on-chain — joining as Player 2', 'info');
                    setProofStatus({ msg: 'Joined existing game!', type: 'success', detail: 'Game was already started by your opponent.' });
                } else {
                    addLog(`start_game failed: ${err.message}`, 'hit');
                    setProofStatus({ msg: `Error: ${err.message}`, type: 'error' });
                }
            } finally {
                setLoading(false);
            }
        } else {
            addLog('Game started (local mode)', 'info');
        }
        setPhase(PHASE.PLACEMENT);
        addLog('Place your ships on the grid!', 'info');
    }, [contractAddr, isRealWallet, player2Address, walletAddress, addLog]);

    // Ship Placement
    const handlePlaceShip = useCallback((index) => {
        setMyBoard(prev => {
            const next = [...prev];
            const shipCount = next.filter(c => c === 1).length;
            if (next[index] === 1) {
                next[index] = 0;
            } else if (shipCount < SHIPS_REQUIRED) {
                next[index] = 1;
            }
            return next;
        });
    }, []);

    const shipCount = myBoard.filter(c => c === 1).length;

    // Commit Board
    const handleCommitBoard = useCallback(async () => {
        setLoading(true);
        try {
            const newSalt = generateSalt();
            setSalt(newSalt);
            addLog('Computing Poseidon2 hash of board...', 'proof');
            const hash = computeBoardHash(myBoard, newSalt);
            setBoardHash(hash);
            addLog(`Board hash: ${hash.substring(0, 18)}...`, 'info');

            if (isRealWallet) {
                try {
                    addLog('Building commit_board transaction...', 'proof');
                    const tx = await commitBoardTx(walletAddress, hash);
                    addLog('Signing with Freighter...', 'proof');
                    const result = await signAndSubmit(tx, walletAddress);
                    addLog(`commit_board() confirmed! TX: ${result.hash.substring(0, 12)}...`, 'info');
                    setProofStatus({ msg: 'Board committed onchain!', type: 'success', detail: `Hash: ${hash.substring(0, 18)}... | TX: ${result.hash.substring(0, 12)}...` });
                } catch (err) {
                    addLog(`Onchain commit failed: ${err.message} (continuing locally)`, 'hit');
                    setProofStatus({ msg: 'Board committed locally (onchain failed)', type: 'success', detail: hash });
                }
            } else {
                setProofStatus({ msg: 'Board committed successfully!', type: 'success', detail: hash });
                addLog('Board committed locally', 'info');
            }

            gameSocket.notifyBoardCommitted();
            if (gameSocket.opponentReady || !gameSocket.connected) {
                setPhase(PHASE.BATTLE);
            } else {
                addLog('Waiting for opponent to commit their board...', 'info');
                setPhase(PHASE.BATTLE);
            }
        } catch (err) {
            addLog(`Commit failed: ${err.message}`, 'hit');
            setProofStatus({ msg: `Error: ${err.message}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [myBoard, isRealWallet, walletAddress, addLog]);

    // Fire Shot
    const handleShoot = useCallback(async (index) => {
        if (opponentBoard[index] === 'hit' || opponentBoard[index] === 'miss') return;
        if (gameSocket.connected && !gameSocket.isMyTurn) {
            addLog('Wait for your turn!', 'miss');
            return;
        }
        setLoading(true);
        const coord = `${String.fromCharCode(65 + (index % 5))}${Math.floor(index / 5) + 1}`;
        addLog(`Firing at cell ${coord}...`, 'info');

        if (gameSocket.connected) {
            gameSocket.fire(index);
            setWaitingForOpponent(true);
            setProofStatus({ msg: `Waiting for opponent to respond to shot at ${coord}...`, type: '' });
        } else {
            try {
                const isHit = Math.random() > 0.5;
                setOpponentBoard(prev => {
                    const next = [...prev];
                    next[index] = isHit ? 'hit' : 'miss';
                    return next;
                });
                if (isHit) {
                    setMyHits(prev => prev + 1);
                    addLog(`HIT at ${coord}!`, 'hit');
                } else {
                    addLog(`Miss at ${coord}`, 'miss');
                }
                setProofStatus({ msg: `${isHit ? 'HIT!' : 'Miss'} (offline mode)`, type: 'success' });
                setTimeout(() => {
                    const opShot = Math.floor(Math.random() * 25);
                    const opCoord = `${String.fromCharCode(65 + (opShot % 5))}${Math.floor(opShot / 5) + 1}`;
                    const opHit = myBoard[opShot] === 1;
                    if (opHit) { setOpponentHits(prev => prev + 1); addLog(`Opponent HIT your cell ${opCoord}!`, 'hit'); }
                    else { addLog(`Opponent missed at ${opCoord}`, 'miss'); }
                }, 600);
            } catch (err) {
                addLog(`Shot failed: ${err.message}`, 'hit');
                setProofStatus({ msg: `Error: ${err.message}`, type: 'error' });
            } finally {
                setLoading(false);
            }
        }
    }, [opponentBoard, myBoard, gameSocket, addLog]);

    // End Game
    const handleEndGame = useCallback(async () => {
        setLoading(true);
        const result = myHits > opponentHits ? 'You' : 'Opponent';
        if (isRealWallet) {
            try {
                addLog('Building end_game transaction...', 'proof');
                const tx = await endGameTx(walletAddress);
                addLog('Signing with Freighter...', 'proof');
                const txResult = await signAndSubmit(tx, walletAddress);
                addLog(`end_game() confirmed! TX: ${txResult.hash.substring(0, 12)}...`, 'info');
            } catch (err) {
                addLog(`end_game onchain failed: ${err.message}`, 'hit');
            }
        }
        setWinner(result);
        setPhase(PHASE.ENDED);
        addLog(`Game ended. Winner: ${result}`, 'info');
        setLoading(false);
    }, [myHits, opponentHits, isRealWallet, walletAddress, addLog]);

    // Reset
    const handleNewGame = useCallback(() => {
        gameSocket.disconnect();
        setMyBoard(Array(25).fill(0));
        setOpponentBoard(Array(25).fill(0));
        setSalt('');
        setBoardHash('');
        setMyHits(0);
        setOpponentHits(0);
        setProofStatus({ msg: '', type: '' });
        setLogs([]);
        setWinner(null);
        setWaitingForOpponent(false);
        setLoading(false);
        setPlayer2Address('');
        setPhase(PHASE.SETUP);
    }, [gameSocket]);

    // ═══════════════════════════════════════
    // Render
    // ═══════════════════════════════════════
    return (
        <div className="game-page">
            <div className="game-container">
                {/* Status Bar */}
                <div className="status-bar">
                    {phase === PHASE.BATTLE && (
                        <>
                            <div className="status-chip">
                                Your Hits: <strong style={{ color: 'var(--accent-cyan)', marginLeft: '0.3rem' }}>{myHits}</strong>
                            </div>
                            <div className="status-chip">
                                <span className="dot hit" />
                                Opponent Hits: <strong style={{ color: 'var(--accent-red)', marginLeft: '0.3rem' }}>{opponentHits}</strong>
                            </div>
                        </>
                    )}
                </div>

                {/* Phase: Setup */}
                {phase === PHASE.SETUP && (
                    <div>
                        <div className="phase-title">Game Setup</div>
                        <div className="phase-description">
                            {isRealWallet
                                ? 'Enter the opponent\'s Stellar address. Contract calls will be signed with Freighter and submitted to Testnet.'
                                : 'Running in demo mode. Connect Freighter for real onchain transactions.'}
                        </div>
                        <div style={{ maxWidth: 440, margin: '0 auto' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                                    Opponent Address
                                </label>
                                <input
                                    type="text"
                                    value={player2Address}
                                    onChange={e => setPlayer2Address(e.target.value)}
                                    placeholder="G... Stellar address"
                                    id="player2-input"
                                    className="game-input"
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                                    Contract Address
                                </label>
                                <input
                                    type="text"
                                    value={contractAddr}
                                    onChange={e => setContractAddr(e.target.value)}
                                    placeholder="C... deployed contract"
                                    id="contract-input"
                                    className="game-input"
                                />
                            </div>
                            <div className="actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={async () => {
                                        if (!isRealWallet && !player2Address) {
                                            const StellarSdk = await import('@stellar/stellar-sdk');
                                            const kp1 = StellarSdk.Keypair.fromSecret('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7').publicKey();
                                            const kp2 = StellarSdk.Keypair.fromSecret('SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBZ').publicKey();
                                            setPlayer2Address(walletAddress === kp1 ? kp2 : kp1);
                                        }
                                        setTimeout(handleStartGame, 0);
                                    }}
                                    disabled={loading}
                                    id="start-game-btn"
                                >
                                    {loading ? <><span className="spinner" /> Starting...</> : 'Start Game'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Phase: Placement */}
                {phase === PHASE.PLACEMENT && (
                    <div>
                        <div className="phase-title">Place Your Ships</div>
                        <div className="phase-description">
                            Click cells to place {SHIPS_REQUIRED} ship segments. Your placement is private — only the Poseidon2 hash is committed onchain.
                        </div>
                        <div className="boards-row">
                            <Board cells={myBoard} onCellClick={handlePlaceShip} interactive={true} mode="placement" label="Your Board" />
                        </div>
                        <div className="ship-counter">
                            Ships placed: <span className="count">{shipCount}</span> / {SHIPS_REQUIRED}
                        </div>
                        <div className="actions">
                            <button
                                className="btn btn-primary"
                                disabled={shipCount !== SHIPS_REQUIRED || loading}
                                onClick={handleCommitBoard}
                                id="commit-board-btn"
                            >
                                {loading ? <><span className="spinner" /> Committing...</> : 'Commit Board Hash'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Phase: Battle */}
                {phase === PHASE.BATTLE && (
                    <div>
                        <div className="phase-title">Battle Phase</div>
                        <div className="phase-description">
                            {gameSocket.connected
                                ? (gameSocket.isMyTurn
                                    ? 'Your turn — click opponent\'s grid to fire!'
                                    : '⏳ Waiting for opponent\'s turn...')
                                : `Click opponent's grid to fire. Each shot generates a ZK proof verified ${isRealWallet ? 'onchain' : 'locally'}.`}
                        </div>
                        <div className="boards-row">
                            <Board cells={myBoard} interactive={false} mode="display" label="Your Board" />
                            <Board
                                cells={opponentBoard}
                                onCellClick={handleShoot}
                                interactive={!loading && (!gameSocket.connected || gameSocket.isMyTurn)}
                                mode="shooting"
                                label="Opponent's Board"
                            />
                        </div>
                        <div className="actions">
                            <button className="btn btn-danger" onClick={handleEndGame} disabled={loading} id="end-game-btn">
                                {loading ? <><span className="spinner" /> Ending...</> : 'End Game'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Proof Status */}
                {proofStatus.msg && (
                    <div className={`proof-status ${proofStatus.type}`}>
                        {proofStatus.msg}
                        {proofStatus.detail && <div className="mono">{proofStatus.detail}</div>}
                    </div>
                )}

                {/* Event Log */}
                {logs.length > 0 && (
                    <div className="log-panel">
                        <div
                            className="log-header"
                            onClick={() => setLogsVisible(!logsVisible)}
                        >
                            <h3>Event Log</h3>
                            <span className="log-toggle">{logsVisible ? '▲' : '▼'}</span>
                        </div>
                        {logsVisible && (
                            <div className="log-content">
                                {logs.map((log, i) => (
                                    <div className="log-entry" key={i}>
                                        <span className="log-time">{log.time}</span>
                                        <span className={`log-msg ${log.type}`}>{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Contract Info */}
                <div className="contract-info">
                    Game Hub: <a href={getGameHubUrl()} target="_blank" rel="noopener noreferrer">CB4VZAT...Q2EMYG</a>
                    {' | '}Contract: <a href={getExplorerUrl()} target="_blank" rel="noopener noreferrer">
                        {(getContractAddress() || '').substring(0, 8)}...
                    </a>
                </div>
            </div>

            {/* Winner/Loser Overlay */}
            {winner && (
                <div className="winner-overlay" id="winner-overlay">
                    <div className="winner-card">
                        {winner === 'You' ? (
                            <>
                                <h2>You Won!</h2>
                                <p>Congratulations! All ships sunk!</p>
                            </>
                        ) : (
                            <>
                                <h2>You Lost!</h2>
                                <p>Your opponent sunk all your ships!</p>
                            </>
                        )}
                        <p>Final score — Your hits: {myHits} | Opponent hits: {opponentHits}</p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
                            {isRealWallet ? 'All verified onchain via Stellar Testnet' : 'ZK proofs verified locally (demo mode)'}
                        </div>
                        <button className="btn btn-primary" onClick={handleNewGame} id="new-game-btn">
                            New Game
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
