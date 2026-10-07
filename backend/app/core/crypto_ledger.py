"""
Tamper-Proof Cryptographic Audit Ledger for CivicPulse.

Implements:
1. Deterministic SHA-256 Block Hashing for multi-tier approval steps
   (Pradhan -> Engineer -> Admin).
2. Genesis Block & Hash generation tied to immutable evidence metadata.
3. HMAC-SHA256 Cryptographic Signatures for verified step decisions.
4. Binary Merkle Tree computation with audit proof generation and proof verification.
5. End-to-end cryptographic chain validation with tamper detection.
"""

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.config import get_settings

GENESIS_PREV_HASH = "0" * 64
LEVEL_SEQUENCE = ["pradhan", "engineer", "admin"]


def sha256_hex(data: str | bytes) -> str:
    """Compute SHA-256 hex digest of string or bytes."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def canonical_json_dumps(obj: Any) -> str:
    """
    Serialize data to canonical JSON string:
    - Sorted keys
    - No unnecessary whitespace (separators=(',', ':'))
    - ISO 8601 UTC timestamps
    """
    def default_serializer(o: Any):
        if isinstance(o, datetime):
            if o.tzinfo is None:
                o = o.replace(tzinfo=timezone.utc)
            return o.isoformat()
        if hasattr(o, "value"):  # Enum support
            return o.value
        return str(o)

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), default=default_serializer)


def normalize_timestamp(val: Any) -> str:
    """Produces a deterministic, canonical ISO timestamp string across DB drivers."""
    if not val:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%dT%H:%M:%SZ")
    s = str(val).strip().replace(" ", "T")
    # Strip fractional seconds and tz offsets for canonical determinism
    s = s.split(".")[0].split("+")[0].rstrip("Z")
    return f"{s}Z" if s else ""


def compute_genesis_hash(
    evidence_id: int,
    project_id: str,
    image_path: str,
    created_at: datetime | str | None = None,
    phash: str | None = None,
) -> str:
    """
    Compute immutable Genesis Hash anchoring the approval chain to the physical evidence.
    """
    genesis_payload = {
        "type": "CIVICPULSE_GENESIS_BLOCK",
        "evidence_id": evidence_id,
        "project_id": project_id,
        "image_path": str(image_path),
        "phash": phash or "",
        "created_at": normalize_timestamp(created_at),
    }
    return sha256_hex(canonical_json_dumps(genesis_payload))


def compute_block_hash(
    prev_hash: str,
    step_id: int,
    evidence_id: int,
    level: Any,
    decision: Any,
    reviewer_id: Optional[int],
    remarks: Optional[str],
    decided_at: Optional[datetime | str],
) -> str:
    """
    Compute SHA-256 block hash for an approval step.
    Chain link: current_hash = SHA256(canonical_json(block_payload))
    where block_payload includes prev_hash.
    """
    level_str = str(level.value if hasattr(level, "value") else level)
    decision_str = str(decision.value if hasattr(decision, "value") else decision)

    payload = {
        "prev_hash": prev_hash,
        "step_id": step_id,
        "evidence_id": evidence_id,
        "level": level_str,
        "decision": decision_str,
        "reviewer_id": reviewer_id,
        "remarks": remarks or "",
        "decided_at": normalize_timestamp(decided_at),
    }
    return sha256_hex(canonical_json_dumps(payload))


def compute_step_signature(
    block_hash: str,
    reviewer_id: Optional[int],
    role: str,
    secret_key: Optional[str] = None,
) -> str:
    """
    Generate HMAC-SHA256 signature for an approval step block hash.
    Authenticates the reviewer role and server cryptographic identity.
    """
    if not secret_key:
        settings = get_settings()
        secret_key = settings.ledger_hmac_key
        if not secret_key:
            secret_key = hashlib.sha256(f"civicpulse_ledger_domain_salt_{settings.jwt_secret_key}".encode("utf-8")).hexdigest()

    signing_msg = f"{block_hash}:{reviewer_id or 0}:{role}"
    sig = hmac.new(
        secret_key.encode("utf-8"),
        signing_msg.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return sig


def verify_step_signature(
    block_hash: str,
    signature: str,
    reviewer_id: Optional[int],
    role: str,
    secret_key: Optional[str] = None,
) -> bool:
    """
    Verify HMAC-SHA256 signature against block hash and reviewer role.
    """
    if not signature or not block_hash:
        return False
    expected = compute_step_signature(block_hash, reviewer_id, role, secret_key)
    return hmac.compare_digest(expected, signature)


class MerkleTree:
    """
    Binary Merkle Tree implementation using SHA-256.
    Computes cryptographic root hash and audit proof paths.
    """

    def __init__(self, leaves: list[str]):
        """
        leaves: list of hex-encoded leaf hashes or raw strings.
        If leaves is empty, root is 64 zeros.
        """
        self.raw_leaves = leaves[:]
        self.levels: list[list[str]] = []
        self._build_tree()

    def _build_tree(self) -> None:
        if not self.raw_leaves:
            self.levels = [[GENESIS_PREV_HASH]]
            return

        current_level = [leaf if len(leaf) == 64 else sha256_hex(leaf) for leaf in self.raw_leaves]
        self.levels = [current_level]

        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                # If odd number of nodes, pair the last node with itself
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                combined = sha256_hex(f"{left}:{right}")
                next_level.append(combined)
            self.levels.append(next_level)
            current_level = next_level

    @property
    def root(self) -> str:
        """Returns the Merkle root hash (hex string)."""
        if not self.levels or not self.levels[-1]:
            return GENESIS_PREV_HASH
        return self.levels[-1][0]

    def get_proof(self, leaf_index: int) -> list[dict[str, Any]]:
        """
        Get Merkle audit proof path for leaf at leaf_index.
        Returns list of {'position': 'left'|'right', 'hash': str}.
        """
        if leaf_index < 0 or leaf_index >= len(self.raw_leaves):
            return []

        proof = []
        idx = leaf_index
        for level in self.levels[:-1]:
            is_right = (idx % 2 == 1)
            sibling_idx = idx - 1 if is_right else idx + 1
            if sibling_idx >= len(level):
                sibling_idx = idx  # Paired with self
            proof.append({
                "position": "left" if is_right else "right",
                "hash": level[sibling_idx],
            })
            idx = idx // 2
        return proof

    @staticmethod
    def verify_proof(leaf_hash: str, proof: list[dict[str, Any]], root_hash: str) -> bool:
        """
        Verifies Merkle audit proof against the expected root hash.
        """
        current = leaf_hash if len(leaf_hash) == 64 else sha256_hex(leaf_hash)
        for item in proof:
            sibling = item["hash"]
            if item["position"] == "left":
                current = sha256_hex(f"{sibling}:{current}")
            else:
                current = sha256_hex(f"{current}:{sibling}")
        return hmac.compare_digest(current, root_hash)


def validate_approval_chain(evidence: Any, approval_steps: list[Any]) -> dict[str, Any]:
    """
    Validates cryptographic hash chain and signatures across Pradhan -> Engineer -> Admin steps.
    """
    # Sort steps by predefined hierarchy order
    level_rank = {lvl: idx for idx, lvl in enumerate(LEVEL_SEQUENCE)}
    sorted_steps = sorted(
        approval_steps,
        key=lambda s: level_rank.get(s.level.value if hasattr(s.level, "value") else str(s.level), 99),
    )

    genesis_hash = compute_genesis_hash(
        evidence_id=evidence.id,
        project_id=evidence.project_id,
        image_path=evidence.image_path,
        created_at=evidence.created_at,
        phash=evidence.phash,
    )

    chain_details: list[dict[str, Any]] = []
    is_valid = True
    tamper_detected = False
    tamper_reasons: list[str] = []
    verified_steps_count = 0
    expected_prev_hash = genesis_hash
    leaf_hashes: list[str] = []

    for idx, step in enumerate(sorted_steps):
        level_str = step.level.value if hasattr(step.level, "value") else str(step.level)
        decision_str = step.decision.value if hasattr(step.decision, "value") else str(step.decision)
        is_pending = decision_str == "pending"

        hash_valid = False
        signature_valid = False
        link_valid = False

        if is_pending:
            # Step hasn't been reviewed yet
            link_valid = (step.prev_hash is None or step.prev_hash == expected_prev_hash)
            hash_valid = (step.block_hash is None)
            signature_valid = (step.signature is None)
            leaf_hash = sha256_hex(f"PENDING:{level_str}:{step.id}:{expected_prev_hash}")
            leaf_hashes.append(leaf_hash)
        else:
            # Step was reviewed -> must have valid prev_hash, block_hash, signature
            # Check 1: Link to previous block / genesis
            link_valid = (step.prev_hash == expected_prev_hash)
            if not link_valid:
                is_valid = False
                tamper_detected = True
                tamper_reasons.append(
                    f"Link broken at step '{level_str}' (ID {step.id}): expected prev_hash {expected_prev_hash[:12]}..., got {str(step.prev_hash)[:12]}..."
                )

            # Check 2: Block hash integrity
            expected_block_hash = compute_block_hash(
                prev_hash=step.prev_hash or expected_prev_hash,
                step_id=step.id,
                evidence_id=evidence.id,
                level=level_str,
                decision=decision_str,
                reviewer_id=step.reviewer_id,
                remarks=step.remarks,
                decided_at=step.decided_at,
            )
            hash_valid = (step.block_hash == expected_block_hash)
            if not hash_valid:
                is_valid = False
                tamper_detected = True
                tamper_reasons.append(
                    f"Hash mismatch at step '{level_str}' (ID {step.id}): computed {expected_block_hash[:12]}..., recorded {str(step.block_hash)[:12]}..."
                )

            # Check 3: Digital signature
            signature_valid = verify_step_signature(
                block_hash=step.block_hash or expected_block_hash,
                signature=step.signature or "",
                reviewer_id=step.reviewer_id,
                role=level_str,
            )
            if not signature_valid:
                is_valid = False
                tamper_detected = True
                tamper_reasons.append(
                    f"Invalid signature at step '{level_str}' (ID {step.id}) by reviewer {step.reviewer_id}"
                )

            if link_valid and hash_valid and signature_valid:
                verified_steps_count += 1

            leaf_hashes.append(step.block_hash or expected_block_hash)
            # Next step expects this step's block hash
            expected_prev_hash = step.block_hash or expected_block_hash

        reviewer_name = None
        if hasattr(step, "reviewer") and step.reviewer:
            reviewer_name = step.reviewer.name

        chain_details.append({
            "step_id": step.id,
            "level": level_str,
            "decision": decision_str,
            "reviewer_id": step.reviewer_id,
            "reviewer_name": reviewer_name,
            "remarks": step.remarks,
            "decided_at": step.decided_at.isoformat() if isinstance(step.decided_at, datetime) else (str(step.decided_at) if step.decided_at else None),
            "block_hash": step.block_hash,
            "prev_hash": step.prev_hash,
            "signature": step.signature,
            "hash_valid": hash_valid,
            "signature_valid": signature_valid,
            "link_valid": link_valid,
        })

    # Merkle tree calculation
    tree = MerkleTree(leaf_hashes)

    return {
        "evidence_id": evidence.id,
        "project_id": evidence.project_id,
        "is_valid": is_valid,
        "tamper_detected": tamper_detected,
        "tamper_reason": "; ".join(tamper_reasons) if tamper_reasons else None,
        "merkle_root": tree.root,
        "total_steps": len(sorted_steps),
        "verified_steps": verified_steps_count,
        "chain": chain_details,
        "genesis_hash": genesis_hash,
        "verified_at": datetime.now(timezone.utc),
    }
