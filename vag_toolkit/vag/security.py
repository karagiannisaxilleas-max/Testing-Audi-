"""
VAG seed-key algorithms for security access.

Different ECUs use different algorithms. Module 5F (MIB3) uses the
'A2' algorithm variant common in newer VAG infotainment units.
"""

import struct


def _rol32(value: int, count: int) -> int:
    """32-bit rotate left."""
    count %= 32
    return ((value << count) | (value >> (32 - count))) & 0xFFFFFFFF


def compute_key_a2(seed: bytes) -> bytes:
    """
    VAG security access algorithm variant A2.
    Used by MIB3 module 5F and several other 2019+ VAG ECUs.
    Returns the 4-byte key for the given 4-byte seed.
    """
    if len(seed) < 4:
        raise ValueError(f"Expected 4-byte seed, got {len(seed)}")

    s = struct.unpack(">I", seed[:4])[0]

    # Constants derived from reverse engineering of MIB3 firmware
    c1 = 0xB8E04BE7
    c2 = 0x3DF23A18
    c3 = 0x4A9C6F51

    k = s ^ c1
    k = _rol32(k, 11)
    k = (k + c2) & 0xFFFFFFFF
    k = k ^ (k >> 13)
    k = (k * c3) & 0xFFFFFFFF
    k = k ^ (k >> 17)
    k = (k * 0x6C62272E) & 0xFFFFFFFF
    k = k ^ (k >> 16)

    return struct.pack(">I", k)


def compute_key_standard(seed: bytes) -> bytes:
    """
    Classic VAG seed-key algorithm used in older ECUs (pre-2018).
    Kept for reference / module scanning against legacy units.
    """
    if len(seed) < 2:
        raise ValueError(f"Expected at least 2-byte seed, got {len(seed)}")

    s = struct.unpack(">H", seed[:2])[0]
    key = (s >> 5 | s << 11) & 0xFFFF
    key = key ^ 0x8765
    key = (key >> 8 | key << 8) & 0xFFFF
    key = key ^ 0x00CE
    key = (key & 0xFF00) | ((key + 0x59) & 0xFF)
    return struct.pack(">H", key)


# Map module IDs to their key algorithm
MODULE_KEY_FN = {
    "5F": compute_key_a2,   # MIB3 Information Electronics
    "19": compute_key_standard,
    "DEFAULT": compute_key_standard,
}


def get_key_fn(module: str):
    return MODULE_KEY_FN.get(module.upper(), MODULE_KEY_FN["DEFAULT"])
