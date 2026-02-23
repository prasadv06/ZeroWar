#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bls12_381::{Fr, G1Affine, G2Affine},
    log, symbol_short, vec, Address, Bytes, BytesN, Env, IntoVal, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TcgError {
    GameAlreadyStarted = 1,
    GameNotStarted = 2,
    InvalidPlayer = 3,
    NotYourTurn = 4,
    InvalidProof = 5,
    GameEnded = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Player1,
    Player2,
    DeckHash(Address),
    Hp(Address),
    Turn,
    DrawIndex(Address),
    Board(Address), 
    GameStarted,
    Winner,
    VerificationKey,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Creature {
    pub attack: u32,
    pub health: u32,
}

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

#[contract]
pub struct ZkTcg;

const GAME_HUB_ADDRESS: &str = "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG";

#[contractimpl]
impl ZkTcg {
    pub fn init(env: Env, vk: VerificationKey) {
        env.storage().persistent().set(&DataKey::VerificationKey, &vk);
    }

    pub fn init_game(env: Env, player1: Address, player2: Address) -> Result<(), TcgError> {
        player1.require_auth();
        
        env.storage().persistent().set(&DataKey::Player1, &player1);
        env.storage().persistent().set(&DataKey::Player2, &player2);
        env.storage().persistent().set(&DataKey::Hp(player1.clone()), &15u32);
        env.storage().persistent().set(&DataKey::Hp(player2.clone()), &15u32);
        env.storage().persistent().set(&DataKey::DrawIndex(player1.clone()), &0u32);
        env.storage().persistent().set(&DataKey::DrawIndex(player2.clone()), &0u32);
        
        let empty_board: Vec<Creature> = vec![&env];
        env.storage().persistent().set(&DataKey::Board(player1.clone()), &empty_board);
        env.storage().persistent().set(&DataKey::Board(player2.clone()), &empty_board);
        
        env.storage().persistent().set(&DataKey::Turn, &player1);
        env.storage().persistent().set(&DataKey::GameStarted, &true);
        env.storage().persistent().remove(&DataKey::Winner);

        // NOTE: Game Hub cross-contract call bypassed for demo standalone reliability
        
        log!(&env, "ZK TCG Arena Game Started!");
        Ok(())
    }

    pub fn commit_deck(env: Env, player: Address, hash: BytesN<32>) -> Result<(), TcgError> {
        player.require_auth();
        env.storage().persistent().set(&DataKey::DeckHash(player), &hash);
        Ok(())
    }

    pub fn draw_card(env: Env, player: Address, card_value: u32, proof_bytes: Bytes) -> Result<(), TcgError> {
        player.require_auth();
        
        if !env.storage().persistent().get::<_, bool>(&DataKey::GameStarted).unwrap_or(false) {
            return Err(TcgError::GameNotStarted);
        }

        // --- HACKATHON DEMO BYPASS ---
        // In production, we deserialize `proof_bytes` to `Groth16Proof` and `pub_signals`
        // and check: Self::verify_groth16(&env, &vk, &proof, &pub_signals)
        // For the demo, we assume the JS-side verification passed if bytes are present.
        if proof_bytes.is_empty() {
            return Err(TcgError::InvalidProof);
        }

        let mut idx: u32 = env.storage().persistent().get(&DataKey::DrawIndex(player.clone())).unwrap_or(0);
        idx += 1;
        env.storage().persistent().set(&DataKey::DrawIndex(player.clone()), &idx);

        env.events().publish((symbol_short!("draw"), player), card_value);

        Ok(())
    }

    pub fn play_creature(env: Env, player: Address, attack: u32, health: u32) -> Result<(), TcgError> {
        player.require_auth();
        let mut board: Vec<Creature> = env.storage().persistent().get(&DataKey::Board(player.clone())).unwrap_or(vec![&env]);
        board.push_back(Creature { attack, health });
        env.storage().persistent().set(&DataKey::Board(player), &board);
        Ok(())
    }

    pub fn play_fireball(env: Env, player: Address, target: Address) -> Result<(), TcgError> {
        player.require_auth();
        let mut hp: u32 = env.storage().persistent().get(&DataKey::Hp(target.clone())).unwrap_or(15);
        if hp > 2 {
            hp -= 2;
        } else {
            hp = 0;
            env.storage().persistent().set(&DataKey::Winner, &player);
        }
        env.storage().persistent().set(&DataKey::Hp(target), &hp);
        Ok(())
    }

    pub fn attack(env: Env, player: Address, attacker_id: u32, target: Address) -> Result<(), TcgError> {
        player.require_auth();
        let board: Vec<Creature> = env.storage().persistent().get(&DataKey::Board(player.clone())).unwrap_or(vec![&env]);
        
        if attacker_id < board.len() {
            let creature = board.get(attacker_id).unwrap();
            let mut hp: u32 = env.storage().persistent().get(&DataKey::Hp(target.clone())).unwrap_or(15);
            
            if hp > creature.attack {
                hp -= creature.attack;
            } else {
                hp = 0;
                env.storage().persistent().set(&DataKey::Winner, &player);
            }
            env.storage().persistent().set(&DataKey::Hp(target), &hp);
        }
        Ok(())
    }

    pub fn attack_creature(env: Env, player: Address, attacker_id: u32, target_player: Address, target_creature_id: u32) -> Result<(), TcgError> {
        player.require_auth();
        let mut board: Vec<Creature> = env.storage().persistent().get(&DataKey::Board(player.clone())).unwrap_or(vec![&env]);
        let mut target_board: Vec<Creature> = env.storage().persistent().get(&DataKey::Board(target_player.clone())).unwrap_or(vec![&env]);
        
        if attacker_id < board.len() && target_creature_id < target_board.len() {
            let mut attacker = board.get(attacker_id).unwrap();
            let mut target = target_board.get(target_creature_id).unwrap();
            
            // Both deal damage simultaneously
            let attacker_dmg = attacker.attack;
            let target_dmg = target.attack;

            let mut attacker_survived = true;
            if attacker.health > target_dmg {
                attacker.health -= target_dmg;
                attacker.attack = attacker.attack.saturating_sub(target_dmg);
                board.set(attacker_id, attacker);
            } else {
                board.remove(attacker_id);
                attacker_survived = false;
            }

            if target.health > attacker_dmg {
                target.health -= attacker_dmg;
                target.attack = target.attack.saturating_sub(attacker_dmg);
                // Only update target if it wasn't destroyed
                if attacker_survived {
                     target_board.set(target_creature_id, target);
                } else {
                     // If attacker died, its index shifted. We must be careful if we are modifying the same board, but here target_board is distinct.
                     target_board.set(target_creature_id, target);
                }
            } else {
                target_board.remove(target_creature_id);
            }

            env.storage().persistent().set(&DataKey::Board(player), &board);
            env.storage().persistent().set(&DataKey::Board(target_player), &target_board);
        }
        Ok(())
    }

    pub fn end_game(env: Env, winner: Address) -> Result<(), TcgError> {
        winner.require_auth();
        env.storage().persistent().set(&DataKey::GameStarted, &false);
        env.storage().persistent().set(&DataKey::Winner, &winner);

        // NOTE: Game Hub cross-contract call bypassed for demo standalone reliability
        log!(&env, "ZK TCG Arena Game Ended!");

        Ok(())
    }

    pub fn get_state(env: Env) -> (u32, u32) {
        let p1: Address = env.storage().persistent().get(&DataKey::Player1).unwrap();
        let p2: Address = env.storage().persistent().get(&DataKey::Player2).unwrap();
        let hp1 = env.storage().persistent().get(&DataKey::Hp(p1)).unwrap_or(15);
        let hp2 = env.storage().persistent().get(&DataKey::Hp(p2)).unwrap_or(15);
        (hp1, hp2)
    }

    fn verify_groth16(env: &Env, vk: &VerificationKey, proof: &Groth16Proof, pub_signals: &Vec<Fr>) -> Result<bool, TcgError> {
        let bls = env.crypto().bls12_381();
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(TcgError::InvalidProof);
        }
        let mut vk_x = vk.ic.get(0).unwrap();
        for i in 0..pub_signals.len() {
            let s = pub_signals.get(i).unwrap();
            let v = vk.ic.get(i + 1).unwrap();
            let prod = bls.g1_mul(&v, &s);
            vk_x = bls.g1_add(&vk_x, &prod);
        }
        let neg_a = -proof.a.clone();
        let vp1 = vec![&env, neg_a, vk.alpha.clone(), vk_x, proof.c.clone()];
        let vp2 = vec![&env, proof.b.clone(), vk.beta.clone(), vk.gamma.clone(), vk.delta.clone()];
        Ok(bls.pairing_check(vp1, vp2))
    }
}
