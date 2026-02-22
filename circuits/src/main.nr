// ZK Battleship Circuit
// Proves that a player's claimed hit/miss result is consistent
// with their committed board, without revealing the board.
//
// Circuit logic:
// 1. Hash(board || salt) == board_hash  (commitment check)
// 2. board[shot_index] == claimed_result (hit/miss check)

use std::hash::poseidon2_permutation;

// Poseidon2 sponge hash for 26 field elements (25 board + 1 salt)
// Uses rate-3 sponge construction with poseidon2_permutation
fn poseidon2_hash_26(input: [Field; 26]) -> Field {
    // Initialize state: [0, 0, 0, iv] where iv = len * 2^64
    let two_pow_64: Field = 18446744073709551616;
    let iv: Field = 26 * two_pow_64;
    let mut state: [Field; 4] = [0, 0, 0, iv];

    // Absorb 26 elements in chunks of 3 (rate = 3)
    // Chunk 0: elements 0..3
    state[0] += input[0];
    state[1] += input[1];
    state[2] += input[2];
    state = poseidon2_permutation(state, 4);

    // Chunk 1: elements 3..6
    state[0] += input[3];
    state[1] += input[4];
    state[2] += input[5];
    state = poseidon2_permutation(state, 4);

    // Chunk 2: elements 6..9
    state[0] += input[6];
    state[1] += input[7];
    state[2] += input[8];
    state = poseidon2_permutation(state, 4);

    // Chunk 3: elements 9..12
    state[0] += input[9];
    state[1] += input[10];
    state[2] += input[11];
    state = poseidon2_permutation(state, 4);

    // Chunk 4: elements 12..15
    state[0] += input[12];
    state[1] += input[13];
    state[2] += input[14];
    state = poseidon2_permutation(state, 4);

    // Chunk 5: elements 15..18
    state[0] += input[15];
    state[1] += input[16];
    state[2] += input[17];
    state = poseidon2_permutation(state, 4);

    // Chunk 6: elements 18..21
    state[0] += input[18];
    state[1] += input[19];
    state[2] += input[20];
    state = poseidon2_permutation(state, 4);

    // Chunk 7: elements 21..24
    state[0] += input[21];
    state[1] += input[22];
    state[2] += input[23];
    state = poseidon2_permutation(state, 4);

    // Chunk 8: elements 24..26 (partial, only 2 elements)
    state[0] += input[24];
    state[1] += input[25];
    state = poseidon2_permutation(state, 4);

    // Squeeze: return first element
    state[0]
}

fn main(
    // Private inputs - known only to the board owner
    board: [Field; 25],      // 5x5 grid, each cell is 0 (water) or 1 (ship)
    salt: Field,             // random salt for commitment

    // Public inputs - visible onchain
    board_hash: pub Field,   // Poseidon2 hash commitment
    shot_index: pub u32,     // index of the shot (0..24)
    claimed_result: pub Field // 0 = miss, 1 = hit
) {
    // Constraint 1: Board values must be binary (0 or 1)
    for i in 0..25 {
        assert(board[i] * (board[i] - 1) == 0, "Board cell must be 0 or 1");
    }

    // Constraint 2: Verify board commitment
    let mut hash_input: [Field; 26] = [0; 26];
    for i in 0..25 {
        hash_input[i] = board[i];
    }
    hash_input[25] = salt;

    let computed_hash = poseidon2_hash_26(hash_input);
    assert(computed_hash == board_hash, "Board hash does not match commitment");

    // Constraint 3: Verify claimed result matches board
    assert(shot_index < 25, "Shot index must be within 5x5 grid");

    // Use a loop to safely access the board at shot_index
    let mut actual_value: Field = 0;
    for i in 0..25 {
        if i as u32 == shot_index {
            actual_value = board[i];
        }
    }

    assert(actual_value == claimed_result, "Claimed result does not match board");
}

#[test]
fn test_valid_hit() {
    // Simple test board: ship at positions 0, 1, 2, 5, 6
    let mut board: [Field; 25] = [0; 25];
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    board[5] = 1;
    board[6] = 1;

    let salt: Field = 42;

    let mut hash_input: [Field; 26] = [0; 26];
    for i in 0..25 {
        hash_input[i] = board[i];
    }
    hash_input[25] = salt;

    let board_hash = poseidon2_hash_26(hash_input);

    // Test hit at position 0
    main(board, salt, board_hash, 0, 1);
}

#[test]
fn test_valid_miss() {
    let mut board: [Field; 25] = [0; 25];
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    board[5] = 1;
    board[6] = 1;

    let salt: Field = 42;

    let mut hash_input: [Field; 26] = [0; 26];
    for i in 0..25 {
        hash_input[i] = board[i];
    }
    hash_input[25] = salt;

    let board_hash = poseidon2_hash_26(hash_input);

    // Test miss at position 10
    main(board, salt, board_hash, 10, 0);
}
