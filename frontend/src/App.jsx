import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import GameHubPage from './pages/GameHubPage';
import GamePage from './pages/GamePage';
import ZkTcgPage from './pages/ZkTcgPage';
import './App.css';

export default function App() {
    const [walletAddress, setWalletAddress] = useState('');
    const [isRealWallet, setIsRealWallet] = useState(false);
    const [gameStatus, setGameStatus] = useState(null);

    const handleWalletConnect = useCallback((address) => {
        setWalletAddress(address);
        const isReal = address.startsWith('G') && address.length === 56;
        setIsRealWallet(isReal);
    }, []);

    const handleDisconnect = useCallback(() => {
        setWalletAddress('');
        setIsRealWallet(false);
        setGameStatus(null);
    }, []);

    return (
        <BrowserRouter>
            <div className="app">
                <Navbar
                    walletAddress={walletAddress}
                    onConnect={handleWalletConnect}
                    onDisconnect={handleDisconnect}
                    gameStatus={gameStatus}
                />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<HomePage walletAddress={walletAddress} />} />
                        <Route path="/game" element={<GameHubPage />} />
                        <Route path="/zkbattleship" element={<GamePage walletAddress={walletAddress} isRealWallet={isRealWallet} setGameStatus={setGameStatus} />} />
                        <Route path="/zktcg" element={<ZkTcgPage walletAddress={walletAddress} isRealWallet={isRealWallet} setGameStatus={setGameStatus} />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}
