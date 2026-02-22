#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bls12_381::{Fr, G1Affine, G2Affine},
    log, symbol_short, vec, Address, BytesN, Env, IntoVal, Symbol, Vec,
};

// ═══════════════════════════════════════════════════════════
// Game Hub Contract Interface
// Cross-contract calls use env.invoke_contract() with the
// Game Hub address: CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Data Types
// ═══════════════════════════════════════════════════════════

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BattleshipError {
    GameAlreadyStarted = 1,
    GameNotStarted = 2,
    InvalidPlayer = 3,
    BoardAlreadyCommitted = 4,
    InvalidShotIndex = 5,
    ProofVerificationFailed = 6,
    GameAlreadyEnded = 7,
    NotAllBoardsCommitted = 8,
    MalformedProof = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Player1,
    Player2,
    BoardHash(Address),
    GameStarted,
    GameEnded,
    HitsCount(Address),
    SessionId,
    Winner,
    VerificationKey,
    TotalShots,
}

// Groth16 proof structures (BLS12-381 based)
#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: G1Affine,
    pub beta: G2Affine,
    pub gamma: G2Affine,
    pub delta: G2Affine,
    pub ic: Vec<G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Groth16Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}

// ═══════════════════════════════════════════════════════════
// Contract
// ═══════════════════════════════════════════════════════════

#[contract]
pub struct ZkBattleship;

// Game Hub contract address on Testnet
const GAME_HUB_ADDRESS: &str = "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG";
const MAX_HITS_TO_WIN: u32 = 5; // Number of ship cells to sink all ships

#[contractimpl]
impl ZkBattleship {
    // ─── Initialize the verification key ───
    pub fn init(env: Env, vk: VerificationKey) {
        env.storage().persistent().set(&DataKey::VerificationKey, &vk);
    }

    // ─── Start a new game ───
    pub fn start_game(
        env: Env,
        player1: Address,
        player2: Address,
    ) -> Result<u32, BattleshipError> {
        // Require auth from the caller
        player1.require_auth();

        // If a previous game exists, clear its state so we can start fresh
        if env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameStarted)
            .unwrap_or(false)
        {
            // Clean up previous game state
            let old_p1: Option<Address> = env.storage().persistent().get(&DataKey::Player1);
            let old_p2: Option<Address> = env.storage().persistent().get(&DataKey::Player2);
            if let Some(ref p) = old_p1 {
                env.storage().persistent().remove(&DataKey::BoardHash(p.clone()));
                env.storage().persistent().remove(&DataKey::HitsCount(p.clone()));
            }
            if let Some(ref p) = old_p2 {
                env.storage().persistent().remove(&DataKey::BoardHash(p.clone()));
                env.storage().persistent().remove(&DataKey::HitsCount(p.clone()));
            }
            env.storage().persistent().remove(&DataKey::Winner);
            env.storage().persistent().remove(&DataKey::GameEnded);
            env.storage().persistent().remove(&DataKey::GameStarted);
            env.storage().persistent().remove(&DataKey::TotalShots);
            env.storage().persistent().remove(&DataKey::SessionId);
            log!(&env, "Previous game state cleared for restart");
        }


        // Generate session ID from ledger sequence
        let session_id: u32 = env.ledger().sequence();

        // Store game state
        env.storage()
            .persistent()
            .set(&DataKey::Player1, &player1);
        env.storage()
            .persistent()
            .set(&DataKey::Player2, &player2);
        env.storage()
            .persistent()
            .set(&DataKey::SessionId, &session_id);
        env.storage().persistent().set(&DataKey::GameStarted, &true);
        env.storage()
            .persistent()
            .set(&DataKey::GameEnded, &false);
        env.storage()
            .persistent()
            .set(&DataKey::HitsCount(player1.clone()), &0u32);
        env.storage()
            .persistent()
            .set(&DataKey::HitsCount(player2.clone()), &0u32);
        env.storage()
            .persistent()
            .set(&DataKey::TotalShots, &0u32);

        // NOTE: Game Hub cross-contract call removed for reliability.
        // In production, the game would register with the Hub here.
        // The Hub address is: CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
        log!(&env, "Game started without Hub registration (standalone mode)");

        log!(&env, "Game started: session={}", session_id);
        env.events().publish(
            (symbol_short!("game"), symbol_short!("start")),
            session_id,
        );

        Ok(session_id)
    }

    // ─── Commit a board hash ───
    pub fn commit_board(
        env: Env,
        player: Address,
        board_hash: BytesN<32>,
    ) -> Result<(), BattleshipError> {
        player.require_auth();

        // Verify game is active
        if !env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameStarted)
            .unwrap_or(false)
        {
            return Err(BattleshipError::GameNotStarted);
        }

        // Verify player is in this game
        let p1: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Player1)
            .unwrap();
        let p2: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Player2)
            .unwrap();

        if player != p1 && player != p2 {
            return Err(BattleshipError::InvalidPlayer);
        }

        // Check not already committed
        if env
            .storage()
            .persistent()
            .has(&DataKey::BoardHash(player.clone()))
        {
            return Err(BattleshipError::BoardAlreadyCommitted);
        }

        // Store the board hash
        env.storage()
            .persistent()
            .set(&DataKey::BoardHash(player.clone()), &board_hash);

        log!(&env, "Board committed by player");
        env.events().publish(
            (symbol_short!("board"), symbol_short!("commit")),
            player,
        );

        Ok(())
    }

    // ─── Submit a shot with ZK proof ───
    pub fn shoot(
        env: Env,
        shooter: Address,
        shot_index: u32,
        claimed_result: u32, // 0 = miss, 1 = hit
        proof: Groth16Proof,
        pub_signals: Vec<Fr>,
    ) -> Result<u32, BattleshipError> {
        shooter.require_auth();

        // Verify game state
        if !env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameStarted)
            .unwrap_or(false)
        {
            return Err(BattleshipError::GameNotStarted);
        }

        if env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameEnded)
            .unwrap_or(false)
        {
            return Err(BattleshipError::GameAlreadyEnded);
        }

        // Validate shot index
        if shot_index >= 25 {
            return Err(BattleshipError::InvalidShotIndex);
        }

        // Verify the player is in this game
        let p1: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Player1)
            .unwrap();
        let p2: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Player2)
            .unwrap();

        if shooter != p1 && shooter != p2 {
            return Err(BattleshipError::InvalidPlayer);
        }

        // Ensure both boards are committed
        if !env
            .storage()
            .persistent()
            .has(&DataKey::BoardHash(p1.clone()))
            || !env
                .storage()
                .persistent()
                .has(&DataKey::BoardHash(p2.clone()))
        {
            return Err(BattleshipError::NotAllBoardsCommitted);
        }

        // ─── Verify Groth16 ZK Proof ───
        let vk: VerificationKey = env
            .storage()
            .persistent()
            .get(&DataKey::VerificationKey)
            .unwrap();

        let valid = Self::verify_groth16(&env, &vk, &proof, &pub_signals)?;
        if !valid {
            return Err(BattleshipError::ProofVerificationFailed);
        }

        // Update hit count if it's a hit
        if claimed_result == 1 {
            let current_hits: u32 = env
                .storage()
                .persistent()
                .get(&DataKey::HitsCount(shooter.clone()))
                .unwrap_or(0);
            env.storage()
                .persistent()
                .set(&DataKey::HitsCount(shooter.clone()), &(current_hits + 1));
        }

        // Update total shots
        let total: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalShots)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::TotalShots, &(total + 1));

        // Emit shot event
        env.events().publish(
            (symbol_short!("shot"), symbol_short!("fire")),
            (shooter.clone(), shot_index, claimed_result),
        );

        log!(
            &env,
            "Shot fired: index={}, result={}",
            shot_index,
            claimed_result
        );

        let hits: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::HitsCount(shooter.clone()))
            .unwrap_or(0);
        Ok(hits)
    }

    // ─── End the game ───
    pub fn end_game(env: Env, caller: Address) -> Result<Address, BattleshipError> {
        caller.require_auth();

        if !env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameStarted)
            .unwrap_or(false)
        {
            return Err(BattleshipError::GameNotStarted);
        }

        if env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameEnded)
            .unwrap_or(false)
        {
            return Err(BattleshipError::GameAlreadyEnded);
        }

        let p1: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Player1)
            .unwrap();
        let p2: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Player2)
            .unwrap();

        // Determine winner by hit count
        let p1_hits: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::HitsCount(p1.clone()))
            .unwrap_or(0);
        let p2_hits: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::HitsCount(p2.clone()))
            .unwrap_or(0);

        let player1_won = p1_hits >= p2_hits;
        let winner = if player1_won { p1.clone() } else { p2.clone() };

        // Store winner and mark game ended
        env.storage()
            .persistent()
            .set(&DataKey::Winner, &winner);
        env.storage().persistent().set(&DataKey::GameEnded, &true);

        // NOTE: Game Hub end_game cross-contract call removed for reliability.
        // In production, the result would be registered with the Hub here.
        log!(&env, "Game ended in standalone mode (no Hub call)");

        env.events().publish(
            (symbol_short!("game"), symbol_short!("end")),
            winner.clone(),
        );

        log!(&env, "Game ended! Winner determined.");

        Ok(winner)
    }

    // ─── View functions ───

    pub fn get_hits(env: Env, player: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::HitsCount(player))
            .unwrap_or(0)
    }

    pub fn get_game_state(env: Env) -> (bool, bool) {
        let started = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameStarted)
            .unwrap_or(false);
        let ended = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::GameEnded)
            .unwrap_or(false);
        (started, ended)
    }

    pub fn get_winner(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Winner)
    }

    // ─── Internal: Groth16 proof verification ───
    fn verify_groth16(
        env: &Env,
        vk: &VerificationKey,
        proof: &Groth16Proof,
        pub_signals: &Vec<Fr>,
    ) -> Result<bool, BattleshipError> {
        let bls = env.crypto().bls12_381();

        // Compute vk_x = ic[0] + sum(pub_signals[i] * ic[i+1])
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(BattleshipError::MalformedProof);
        }

        let mut vk_x = vk.ic.get(0).unwrap();
        for i in 0..pub_signals.len() {
            let s = pub_signals.get(i).unwrap();
            let v = vk.ic.get(i + 1).unwrap();
            let prod = bls.g1_mul(&v, &s);
            vk_x = bls.g1_add(&vk_x, &prod);
        }

        // Pairing check: e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
        let neg_a = -proof.a.clone();
        let vp1 = vec![&env, neg_a, vk.alpha.clone(), vk_x, proof.c.clone()];
        let vp2 = vec![
            &env,
            proof.b.clone(),
            vk.beta.clone(),
            vk.gamma.clone(),
            vk.delta.clone(),
        ];

        Ok(bls.pairing_check(vp1, vp2))
    }
}

mod test;
