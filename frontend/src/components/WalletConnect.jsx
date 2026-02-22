import React, { useState, useCallback } from 'react';

/**
 * WalletConnect component - Freighter wallet integration
 * Uses the official @stellar/freighter-api v2 interface
 */
export default function WalletConnect({ onConnect, connectedAddress }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const connectWallet = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const freighterApi = await import('@stellar/freighter-api');

            // Go straight to requestAccess — it will prompt the user if Freighter is installed.
            // If Freighter is not installed, this will throw an error we catch below.
            const accessObj = await freighterApi.requestAccess();

            // v6 returns { address: string, error?: string }
            // v2 may return a string directly
            if (typeof accessObj === 'string' && accessObj.startsWith('G')) {
                onConnect(accessObj);
            } else if (accessObj && accessObj.error) {
                setError(`Freighter: ${accessObj.error}`);
            } else if (accessObj && accessObj.address) {
                onConnect(accessObj.address);
            } else {
                setError('No address returned. Please approve the request in Freighter.');
            }
        } catch (err) {
            console.error('Wallet connection error:', err);
            if (err.message && err.message.includes('Freighter')) {
                setError('Freighter extension not detected. Please install it from freighter.app');
            } else {
                setError(`Connection failed: ${err.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    }, [onConnect]);

    // We use valid, deterministic secret keys so the addresses are always the same
    // but they are mathematically valid Stellar G... addresses.
    const connectDemo1 = useCallback(async () => {
        const StellarSdk = await import('@stellar/stellar-sdk');
        // A deterministic valid keypair for Player 1
        const kp = StellarSdk.Keypair.fromSecret('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7');
        onConnect(kp.publicKey());
    }, [onConnect]);

    const connectDemo2 = useCallback(async () => {
        const StellarSdk = await import('@stellar/stellar-sdk');
        // A deterministic valid keypair for Player 2
        const kp = StellarSdk.Keypair.fromSecret('SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBZ');
        onConnect(kp.publicKey());
    }, [onConnect]);

    const truncateAddress = (addr) => {
        if (!addr) return '';
        return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
    };

    if (connectedAddress) {
        return (
            <div className="wallet-section">
                <button className="wallet-btn connected" id="wallet-status">
                    <span>🔗</span>
                    <span className="wallet-address">{truncateAddress(connectedAddress)}</span>
                </button>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    To test as opponent, open a new Incognito window and connect the other Demo Wallet.
                </div>
            </div>
        );
    }

    return (
        <div className="wallet-section" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    className="wallet-btn"
                    onClick={connectWallet}
                    disabled={loading}
                    id="connect-wallet-btn"
                >
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <span>🔌</span>
                            Connect Freighter
                        </>
                    )}
                </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Testing locally without Freighter? Use demo mode:
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    className="wallet-btn"
                    onClick={connectDemo1}
                    id="demo-wallet-1-btn"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-cyan)' }}
                >
                    <span>🧑‍🚀</span>
                    Player 1 (Demo)
                </button>
                <button
                    className="wallet-btn"
                    onClick={connectDemo2}
                    id="demo-wallet-2-btn"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-red)' }}
                >
                    <span>👾</span>
                    Player 2 (Demo)
                </button>
            </div>
            {error && <div className="proof-status error" style={{ maxWidth: '440px' }}>{error}</div>}
        </div>
    );
}
