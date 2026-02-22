/**
 * ZK Proof Generation Utilities
 *
 * In production, this module interfaces with the Noir prover (via WASM or CLI)
 * to generate Groth16 proofs. For the hackathon demo, we simulate proof
 * generation to demonstrate the end-to-end flow.
 *
 * The actual circuit verifies:
 * 1. board_hash == Poseidon2(board || salt)
 * 2. board[shot_index] == claimed_result
 */

/**
 * Simple Poseidon-style hash simulation for demo purposes.
 * In production, use the actual Poseidon2 implementation matching the Noir circuit.
 */
export function computeBoardHash(board, salt) {
    // Simulated hash for demo. In production, this would compute
    // Poseidon2 hash over the 25 board fields + salt.
    let hash = BigInt(salt);
    for (let i = 0; i < 25; i++) {
        hash = hash ^ (BigInt(board[i]) << BigInt(i));
        hash = (hash * BigInt('0x100000001b3') + BigInt('0xcbf29ce484222325')) & BigInt('0xFFFFFFFFFFFFFFFF');
    }
    return '0x' + hash.toString(16).padStart(64, '0');
}

/**
 * Generate a random salt for board commitment
 */
export function generateSalt() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a ZK proof for a shot claim.
 *
 * In production flow:
 * 1. nargo compile (done once)
 * 2. bb prove -b ./target/zk_battleship_circuit.json -w ./target/witness.gz -o ./proof
 * 3. bb write_vk -b ./target/zk_battleship_circuit.json -o ./target/vk
 * 4. bb verify -k ./target/vk -p ./proof
 *
 * For the demo, we simulate the proof generation.
 */
export async function generateProof(board, salt, boardHash, shotIndex, claimedResult) {
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validate inputs locally
    if (shotIndex < 0 || shotIndex >= 25) {
        throw new Error('Invalid shot index');
    }

    if (board[shotIndex] !== claimedResult) {
        throw new Error('Claimed result does not match board - proof would fail');
    }

    // Simulate Groth16 proof structure
    // In production, these would be actual BLS12-381 curve points
    const proof = {
        a: generateMockCurvePoint('G1'),
        b: generateMockCurvePoint('G2'),
        c: generateMockCurvePoint('G1'),
    };

    const publicSignals = [boardHash, shotIndex.toString(), claimedResult.toString()];

    return { proof, publicSignals };
}

/**
 * Generate a mock curve point for demo purposes.
 * In production, these are actual elliptic curve points from the prover.
 */
function generateMockCurvePoint(type) {
    const randomHex = () => {
        const arr = new Uint8Array(48);
        crypto.getRandomValues(arr);
        return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    if (type === 'G1') {
        return { x: randomHex(), y: randomHex() };
    }
    // G2 has two components per coordinate (extension field)
    return {
        x: [randomHex(), randomHex()],
        y: [randomHex(), randomHex()],
    };
}

/**
 * Verify a proof locally (for UI feedback).
 * Actual verification happens onchain in the Soroban contract.
 */
export function verifyProofLocally(board, shotIndex, claimedResult) {
    if (shotIndex < 0 || shotIndex >= 25) return false;
    return board[shotIndex] === claimedResult;
}
