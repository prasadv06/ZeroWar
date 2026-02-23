import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage({ walletAddress }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('battleship');

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
                        Trustless Multiplayer Gaming on Stellar
                    </p>
                    <p className="hero-desc">
                        A suite of decentralized games where strategic actions stay private,
                        commitments live on-chain, and every move is verified with Zero Knowledge Proofs.
                    </p>
                </div>
            </section>

            {/* Games Section */}
            <section className="features" style={{ paddingTop: '2rem' }}>
                <h2 className="section-title">Select a Game</h2>
                <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                    {/* ZeroWar (Battleship) Card */}
                    <div className="feature-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3>ZK Battleship (Fog of War)</h3>
                        <p style={{ flexGrow: 1 }}>
                            A 2-player naval combat game where your ship placements stay private.
                            Board commitments live on-chain, and every shot is verified with a
                            Zero Knowledge Proof.
                        </p>
                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/game')}>
                                Play ZK Battleship
                            </button>
                            <a
                                href="https://stellar.expert/explorer/testnet/contract/CDECQBR3TD7FVZ7UOOGR5JXAUILQNUHULFXHJEYBCLYBYHLP2BUTYYCY"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                            >
                                Explorer
                            </a>
                        </div>
                    </div>

                    {/* ZK TCG Arena Card */}
                    <div className="feature-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3>ZK TCG Arena</h3>
                        <p style={{ flexGrow: 1 }}>
                            A Trading Card Game using cryptographic commitments for deck shuffling
                            and drawing. Keep your hand hidden while cryptographically proving you
                            draw from a valid deck without revealing its contents.
                        </p>
                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/zktcg')}>
                                Play ZK TCG
                            </button>
                            <a
                                href="https://stellar.expert/explorer/testnet/contract/CASMLEQ5SIN74UTQ4ECBF4A2SPQR4V6HKKDDUQVEJMFTUOXGNQKORK4H"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                            >
                                Explorer
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Breakdown Tabs */}
            <section style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                    className={`btn ${activeTab === 'battleship' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('battleship')}
                    style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
                    ZK Battleship Details
                </button>
                <button
                    className={`btn ${activeTab === 'tcg' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('tcg')}
                    style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
                    ZK TCG Arena Details
                </button>
            </section>

            {activeTab === 'battleship' && (
                <>
                    {/* Features Section */}
                    <section className="features">
                        <h2 className="section-title">ZK Battleship: How It Works</h2>
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
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )
            }

            {
                activeTab === 'tcg' && (
                    <>
                        {/* Features Section */}
                        <section className="features">
                            <h2 className="section-title">ZK TCG Arena: How It Works</h2>
                            <div className="features-grid">
                                <div className="feature-card">
                                    <h3>Cryptographic Decks</h3>
                                    <p>
                                        Your 12-card deck is locked via a Poseidon2 hash on-chain before the game begins.
                                        Deck stacking is cryptographically impossible.
                                    </p>
                                </div>
                                <div className="feature-card">
                                    <h3>ZK Draw Phase</h3>
                                    <p>
                                        Drawing cards generates a Zero Knowledge proof ensuring your drawn card is
                                        actually from the committed deck without revealing your hand.
                                    </p>
                                </div>
                                <div className="feature-card">
                                    <h3>Hidden Hands</h3>
                                    <p>
                                        Unlike traditional web RPGs, your hand is truly private on your local client
                                        until you explicitly play a card onto the battlefield.
                                    </p>
                                </div>
                                <div className="feature-card">
                                    <h3>Real-Time Combat</h3>
                                    <p>
                                        Summon creatures, cast spells, and attack your opponent directly with
                                        real-time WebSocket resolution on top of the on-chain ZK foundation.
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
                                    <div className="tech-label">ZK Deck System</div>
                                    <div className="tech-value">Noir (Poseidon2)</div>
                                </div>
                                <div className="tech-item">
                                    <div className="tech-label">Draw Validation</div>
                                    <div className="tech-value">Groth16 ZK Proofs</div>
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
                                        <h4>Wallet & Matchmaking</h4>
                                        <p>Connect Freighter and enter your opponent's address to start</p>
                                    </div>
                                </div>
                                <div className="flow-connector" />
                                <div className="flow-step">
                                    <div className="step-num">2</div>
                                    <div className="step-content">
                                        <h4>Commit Deck</h4>
                                        <p>Your 12-card seeded deck is hashed and committed to the Soroban contract</p>
                                    </div>
                                </div>
                                <div className="flow-connector" />
                                <div className="flow-step">
                                    <div className="step-num">3</div>
                                    <div className="step-content">
                                        <h4>Draw & Play</h4>
                                        <p>Generate ZK proofs for your private draws, then summon creatures from your hand</p>
                                    </div>
                                </div>
                                <div className="flow-connector" />
                                <div className="flow-step">
                                    <div className="step-num">4</div>
                                    <div className="step-content">
                                        <h4>Battle Phase</h4>
                                        <p>Command creatures and cast spells to chip away your opponent's 15 HP</p>
                                    </div>
                                </div>
                                <div className="flow-connector" />
                                <div className="flow-step">
                                    <div className="step-num">5</div>
                                    <div className="step-content">
                                        <h4>Victory</h4>
                                        <p>Reduce opponent HP to zero through strategic card combat</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )
            }

        </div >
    );
}
