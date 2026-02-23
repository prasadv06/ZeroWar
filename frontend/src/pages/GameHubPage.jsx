import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GameHubPage() {
    const navigate = useNavigate();

    return (
        <div className="home-page" style={{ paddingTop: '80px', minHeight: 'calc(100vh - 100px)' }}>
            <section className="games-section">
                <h2 className="section-title">Available Games</h2>
                <div className="games-grid">
                    {/* ZK Battleship Card */}
                    <div className="game-card">
                        <div className="game-card-content">
                            <h3>⚓ ZK Battleship</h3>
                            <p>
                                A trustless 2-player naval combat game. Privately place your ships,
                                commit your board on-chain, and verify every shot with Zero Knowledge Proofs.
                            </p>
                            <button className="btn btn-primary mt-4" onClick={() => navigate('/zkbattleship')}>
                                Play ZK Battleship
                            </button>
                        </div>
                    </div>

                    {/* ZK TCG Arena Card */}
                    <div className="game-card">
                        <div className="game-card-content">
                            <h3>🃏 ZK TCG Arena</h3>
                            <p>
                                A privacy-preserving Trading Card Game. Keep your deck hidden and
                                cryptographically prove your moves using Zero Knowledge proofs.
                            </p>
                            <button className="btn btn-primary mt-4" onClick={() => navigate('/zktcg')}>
                                Play ZK TCG Arena
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
