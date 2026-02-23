import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage({ walletAddress }) {
    const navigate = useNavigate();

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-glow" />
                <div className="hero-content">
                    <div className="hero-badge">
                        Zero Knowledge Proofs · Poseidon2 · Groth16
                    </div>
                    <h1 className="hero-title">
                        ZeroWar
                    </h1>
                    <p className="hero-subtitle">
                        Fog of War, Cryptographically Verified on Stellar
                    </p>
                    <p className="hero-desc">
                        A 2-player ZeroWar game where ship placements stay private,
                        board commitments live on-chain, and every shot is verified
                        with a Zero Knowledge Proof.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/game')}>
                            Explore Games
                        </button>
                        <a
                            href="https://stellar.expert/explorer/testnet/contract/CDECQBR3TD7FVZ7UOOGR5JXAUILQNUHULFXHJEYBCLYBYHLP2BUTYYCY"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-lg"
                        >
                            View on Explorer
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <h2 className="section-title">How It Works</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <h3>Private Boards</h3>
                        <p>
                            Place ships secretly. Only a Poseidon2 hash of your board
                            goes on-chain — your opponent never sees your layout.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h3>ZK Proof Verification</h3>
                        <p>
                            Every hit/miss claim is backed by a Groth16 ZK proof.
                            The Noir circuit guarantees honesty without revealing the board.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h3>On-Chain on Stellar</h3>
                        <p>
                            Game state, board hashes, and proof verification all happen
                            on Soroban smart contracts on the Stellar Testnet.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h3>Real-Time 2-Player</h3>
                        <p>
                            Play against a real opponent in real-time via WebSocket.
                            Turns alternate, shots resolve from actual board data.
                        </p>
                    </div>
                </div>
            </section>

            {/* Tech Stack Section */}
            <section className="tech-section">
                <h2 className="section-title">Technology Stack</h2>
                <div className="tech-grid">
                    <div className="tech-item">
                        <div className="tech-label">Smart Contract</div>
                        <div className="tech-value">Rust + Soroban SDK</div>
                    </div>
                    <div className="tech-item">
                        <div className="tech-label">ZK Circuit</div>
                        <div className="tech-value">Noir (Poseidon2)</div>
                    </div>
                    <div className="tech-item">
                        <div className="tech-label">Proof System</div>
                        <div className="tech-value">Groth16 (BLS12-381)</div>
                    </div>
                    <div className="tech-item">
                        <div className="tech-label">Network</div>
                        <div className="tech-value">Stellar Testnet</div>
                    </div>
                    <div className="tech-item">
                        <div className="tech-label">Wallet</div>
                        <div className="tech-value">Freighter</div>
                    </div>
                    <div className="tech-item">
                        <div className="tech-label">Frontend</div>
                        <div className="tech-value">React 18 + Vite 5</div>
                    </div>
                </div>
            </section>

            {/* Game Flow Section */}
            <section className="flow-section">
                <h2 className="section-title">Game Flow</h2>
                <div className="flow-steps">
                    <div className="flow-step">
                        <div className="step-num">1</div>
                        <div className="step-content">
                            <h4>Connect Wallet</h4>
                            <p>Sign in with your Freighter wallet on Stellar Testnet</p>
                        </div>
                    </div>
                    <div className="flow-connector" />
                    <div className="flow-step">
                        <div className="step-num">2</div>
                        <div className="step-content">
                            <h4>Start Game</h4>
                            <p>Enter opponent's address and create a game on-chain</p>
                        </div>
                    </div>
                    <div className="flow-connector" />
                    <div className="flow-step">
                        <div className="step-num">3</div>
                        <div className="step-content">
                            <h4>Place Ships & Commit</h4>
                            <p>Place 5 ships privately, commit Poseidon2 hash on-chain</p>
                        </div>
                    </div>
                    <div className="flow-connector" />
                    <div className="flow-step">
                        <div className="step-num">4</div>
                        <div className="step-content">
                            <h4>Battle!</h4>
                            <p>Fire shots, opponent verifies with ZK proofs, turns alternate</p>
                        </div>
                    </div>
                    <div className="flow-connector" />
                    <div className="flow-step">
                        <div className="step-num">5</div>
                        <div className="step-content">
                            <h4>Victory</h4>
                            <p>First to sink all 5 ships wins — fully verified on Stellar</p>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
