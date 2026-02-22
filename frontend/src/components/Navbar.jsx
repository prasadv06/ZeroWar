import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ walletAddress, onConnect, onDisconnect, gameStatus }) {
    const handleConnect = async () => {
        try {
            const { requestAccess } = await import('@stellar/freighter-api');
            const result = await requestAccess();
            const address = typeof result === 'string' ? result : result?.address || result?.publicKey;
            if (address) {
                onConnect(address);
            }
        } catch (err) {
            console.error('Freighter connect error:', err);
        }
    };

    const shortAddr = walletAddress
        ? `${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)} `
        : '';

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Logo */}
                <NavLink to="/" className="navbar-logo">
                    <img src="/logo.png" alt="ZeroWar" className="logo-image" />
                </NavLink>

                {/* Nav Links */}
                <div className="navbar-links">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        end
                    >
                        Home
                    </NavLink>
                    <NavLink
                        to="/game"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Game
                    </NavLink>
                </div>

                {/* Wallet & Status */}
                <div className="navbar-wallet" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {gameStatus && (
                        <div className="status-chip nav-status-chip">
                            {gameStatus}
                        </div>
                    )}
                    {walletAddress ? (
                        <div className="wallet-connected-group">
                            <div className="wallet-chip">
                                <span className="wallet-dot" />
                                <span className="wallet-addr">{shortAddr}</span>
                            </div>
                            <button className="btn-disconnect" onClick={onDisconnect} title="Disconnect">
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button className="btn-wallet" onClick={handleConnect}>
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
