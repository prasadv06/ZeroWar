/**
 * Stellar / Soroban Contract Interaction Utilities
 *
 * Handles building and submitting transactions to the ZeroWar
 * Soroban smart contract on Stellar Testnet.
 */

import * as StellarSdk from '@stellar/stellar-sdk';

// Configuration
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';

// Contract addresses
const GAME_HUB_CONTRACT = 'CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG';
const DEFAULT_CONTRACT = 'CDECQBR3TD7FVZ7UOOGR5JXAUILQNUHULFXHJEYBCLYBYHLP2BUTYYCY';

let BATTLESHIP_CONTRACT = DEFAULT_CONTRACT;

export function setContractAddress(address) {
    BATTLESHIP_CONTRACT = address || DEFAULT_CONTRACT;
}

export function getContractAddress() {
    return BATTLESHIP_CONTRACT;
}

function getServer() {
    return new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);
}

/**
 * Build a contract call transaction, simulate it, and return for signing
 */
async function buildContractCall(publicKey, functionName, args = []) {
    if (!BATTLESHIP_CONTRACT) {
        throw new Error('Contract address not set');
    }

    const server = getServer();
    const account = await server.getAccount(publicKey);
    const contract = new StellarSdk.Contract(BATTLESHIP_CONTRACT);

    const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '10000000', // 1 XLM max fee for testnet
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call(functionName, ...args))
        .setTimeout(60)
        .build();

    // Simulate to get resource estimates
    const simulated = await server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${JSON.stringify(simulated.error)}`);
    }

    // Assemble with simulation results
    const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simulated).build();
    return preparedTx;
}

/**
 * Sign a transaction with Freighter and submit to the network.
 * We send the raw signed XDR directly via JSON-RPC to avoid
 * XDR parsing incompatibilities between Freighter and stellar-sdk v12.
 */
export async function signAndSubmit(tx, publicKey) {
    const { signTransaction } = await import('@stellar/freighter-api');

    const xdr = tx.toXDR();

    // Call signTransaction — handle all Freighter versions
    const signResult = await signTransaction(xdr, {
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: publicKey,
        address: publicKey,
    });

    console.log('Freighter signTransaction result type:', typeof signResult);

    // Extract signed XDR from whatever format Freighter returns
    let signedXdr;
    if (typeof signResult === 'string') {
        signedXdr = signResult;
    } else if (signResult && signResult.signedTxXdr) {
        signedXdr = signResult.signedTxXdr;
    } else if (signResult && signResult.signedTransaction) {
        signedXdr = signResult.signedTransaction;
    } else if (signResult && signResult.error) {
        throw new Error(`Signing failed: ${signResult.error}`);
    } else {
        throw new Error(`Unexpected Freighter response: ${JSON.stringify(signResult)}`);
    }

    if (!signedXdr) {
        throw new Error('Freighter did not return a signed transaction.');
    }

    // Send raw XDR directly via JSON-RPC to avoid TransactionBuilder.fromXDR() crash
    const sendBody = {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: { transaction: signedXdr },
    };

    const sendResp = await fetch(SOROBAN_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendBody),
    });
    const sendJson = await sendResp.json();

    if (sendJson.error) {
        throw new Error(`Submit failed: ${JSON.stringify(sendJson.error)}`);
    }

    const sendResult = sendJson.result;
    if (sendResult.status === 'ERROR') {
        throw new Error(`Submit failed: ${sendResult.errorResultXdr || 'Unknown error'}`);
    }

    // Wait for confirmation via JSON-RPC
    const hash = sendResult.hash;
    let txStatus = { status: 'NOT_FOUND' };
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusResp = await fetch(SOROBAN_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransaction',
                params: { hash },
            }),
        });
        const statusJson = await statusResp.json();
        txStatus = statusJson.result || { status: 'NOT_FOUND' };
        if (txStatus.status !== 'NOT_FOUND') break;
    }

    return { status: txStatus.status, hash, result: txStatus };
}

/**
 * Start a new game by calling the contract
 */
export async function startGame(publicKey, player2Address) {
    const tx = await buildContractCall(publicKey, 'start_game', [
        new StellarSdk.Address(publicKey).toScVal(),
        new StellarSdk.Address(player2Address).toScVal(),
    ]);
    return tx;
}

/**
 * Commit a board hash to the contract
 */
export async function commitBoard(publicKey, boardHashHex) {
    const hashBytes = new Uint8Array(
        boardHashHex.replace('0x', '').match(/.{1,2}/g).map(b => parseInt(b, 16))
    );

    const tx = await buildContractCall(publicKey, 'commit_board', [
        new StellarSdk.Address(publicKey).toScVal(),
        StellarSdk.xdr.ScVal.scvBytes(hashBytes),
    ]);
    return tx;
}

/**
 * End the game
 */
export async function endGame(publicKey) {
    const tx = await buildContractCall(publicKey, 'end_game', [
        new StellarSdk.Address(publicKey).toScVal(),
    ]);
    return tx;
}

/**
 * Get hit count for a player (read-only, no signing needed)
 */
export async function getHits(playerAddress) {
    if (!BATTLESHIP_CONTRACT) return 0;
    try {
        const server = getServer();
        const contract = new StellarSdk.Contract(BATTLESHIP_CONTRACT);
        const account = await server.getAccount(playerAddress);

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(
                contract.call('get_hits', new StellarSdk.Address(playerAddress).toScVal())
            )
            .setTimeout(30)
            .build();

        const sim = await server.simulateTransaction(tx);
        if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) return 0;
        return StellarSdk.scValToNative(sim.result.retval);
    } catch {
        return 0;
    }
}

export function getExplorerUrl(contractAddress) {
    return `${EXPLORER_BASE}/contract/${contractAddress || BATTLESHIP_CONTRACT}`;
}

export function getGameHubUrl() {
    return `${EXPLORER_BASE}/contract/${GAME_HUB_CONTRACT}`;
}

export function getTxUrl(hash) {
    return `${EXPLORER_BASE}/tx/${hash}`;
}

export { NETWORK_PASSPHRASE, DEFAULT_CONTRACT };
