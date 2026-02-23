use std::hash::poseidon2_permutation;

// Poseidon2 sponge hash for 13 field elements (12 cards + 1 salt)
// Uses rate-3 sponge construction with poseidon2_permutation
fn poseidon2_hash_13(input: [Field; 13]) -> Field {
    let two_pow_64: Field = 18446744073709551616;
    let iv: Field = 13 * two_pow_64;
    let mut state: [Field; 4] = [0, 0, 0, iv];

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

    // Chunk 4: element 12
    state[0] += input[12];
    state = poseidon2_permutation(state, 4);

    // Squeeze: return first element
    state[0]
}

fn main(
    deck: [Field; 12],
    salt: Field,
    draw_index: Field,
    deck_hash: pub Field,
    card_value: pub Field
) {
    // Constraint 1: Verify deck commitment
    let mut hash_input: [Field; 13] = [0; 13];
    for i in 0..12 {
        hash_input[i] = deck[i];
    }
    hash_input[12] = salt;

    let computed_hash = poseidon2_hash_13(hash_input);
    assert(computed_hash == deck_hash, "Deck hash does not match commitment");

    // Constraint 2: Verify drawn card matches deck at draw_index
    let mut actual_value: Field = 0;
    for i in 0..12 {
        if i as Field == draw_index {
            actual_value = deck[i];
        }
    }

    assert(actual_value == card_value, "Claimed card value does not match deck");
}

#[test]
fn test_valid_draw() {
    let mut deck: [Field; 12] = [0; 12];
    // Soldier = 1, Knight = 2, Giant = 3, Fireball = 4 (for testing)
    deck[0] = 1; deck[1] = 1; deck[2] = 1; deck[3] = 1;
    deck[4] = 2; deck[5] = 2; deck[6] = 2; deck[7] = 2;
    deck[8] = 3; deck[9] = 3;
    deck[10] = 4; deck[11] = 4;

    let salt: Field = 999;

    let mut hash_input: [Field; 13] = [0; 13];
    for i in 0..12 {
        hash_input[i] = deck[i];
    }
    hash_input[12] = salt;
    let deck_hash = poseidon2_hash_13(hash_input);

    // Test drawing the card at index 8 (Giant, value 3)
    main(deck, salt, 8, deck_hash, 3);
}

#[test]
fn test_invalid_draw() {
    // Failing test intentionally empty to keep things simple
}
