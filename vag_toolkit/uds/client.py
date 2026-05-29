"""
UDS client — wraps ELM327 transport with proper ISO 14229 framing,
negative response handling, and tester-present keepalive.
"""

import threading
import time
from typing import Optional

from ..transport.elm327 import ELM327, ELM327Error
from .constants import (
    SID_DIAGNOSTIC_SESSION_CONTROL,
    SID_SECURITY_ACCESS,
    SID_TESTER_PRESENT,
    SID_WRITE_DATA_BY_ID,
    SID_READ_DATA_BY_ID,
    SESSION_EXTENDED,
    NRC,
    VAG_MODULE_CAN,
)


class UDSError(Exception):
    def __init__(self, nrc: int, message: str = ""):
        self.nrc = nrc
        super().__init__(message or NRC.get(nrc, f"Unknown NRC 0x{nrc:02X}"))


class UDSClient:
    """
    High-level UDS client for a single ECU module.

    Example:
        elm = ELM327("/dev/ttyUSB0")
        elm.connect()
        client = UDSClient(elm, module="5F")
        client.start_session(SESSION_EXTENDED)
        data = client.read_data(0xF190)   # VIN
        client.close()
    """

    POSITIVE_RESPONSE_OFFSET = 0x40
    NEGATIVE_RESPONSE_SID = 0x7F

    def __init__(self, elm: ELM327, module: str):
        self.elm = elm
        self.module = module.upper().zfill(2)
        self._can_id = VAG_MODULE_CAN.get(self.module)
        self._keepalive_thread: Optional[threading.Thread] = None
        self._keepalive_active = False

        if self._can_id:
            # Set ELM327 header to this module's CAN ID
            elm.at(f"SH {self._can_id:03X}")

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    def start_session(self, session_type: int = SESSION_EXTENDED) -> None:
        resp = self._send([SID_DIAGNOSTIC_SESSION_CONTROL, session_type])
        self._check_response(SID_DIAGNOSTIC_SESSION_CONTROL, resp)
        self._start_keepalive()

    def close(self) -> None:
        self._stop_keepalive()

    # ------------------------------------------------------------------
    # Data read / write
    # ------------------------------------------------------------------

    def read_data(self, data_id: int) -> bytes:
        """Read a data identifier (0x22 service)."""
        hi = (data_id >> 8) & 0xFF
        lo = data_id & 0xFF
        resp = self._send([SID_READ_DATA_BY_ID, hi, lo])
        self._check_response(SID_READ_DATA_BY_ID, resp)
        return bytes(resp[3:])

    def write_data(self, data_id: int, value: bytes) -> None:
        """Write a data identifier (0x2E service)."""
        hi = (data_id >> 8) & 0xFF
        lo = data_id & 0xFF
        payload = [SID_WRITE_DATA_BY_ID, hi, lo] + list(value)
        resp = self._send(payload)
        self._check_response(SID_WRITE_DATA_BY_ID, resp)

    # ------------------------------------------------------------------
    # Security access
    # ------------------------------------------------------------------

    def security_access(self, level: int, key_fn) -> None:
        """
        Perform seed-key security access.
        key_fn(seed: bytes) -> bytes  — caller provides the key computation.
        """
        seed_resp = self._send([SID_SECURITY_ACCESS, level])
        self._check_response(SID_SECURITY_ACCESS, seed_resp)
        seed = bytes(seed_resp[2:])

        key = key_fn(seed)
        key_resp = self._send([SID_SECURITY_ACCESS, level + 1] + list(key))
        self._check_response(SID_SECURITY_ACCESS, key_resp)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _send(self, payload: list[int]) -> list[int]:
        hex_cmd = " ".join(f"{b:02X}" for b in payload)
        raw = self.elm.send_raw(hex_cmd)
        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> list[int]:
        # Strip headers, spaces, newlines; collect hex bytes
        lines = raw.strip().splitlines()
        bytes_out: list[int] = []
        for line in lines:
            line = line.strip()
            # Skip echo lines and empty lines
            if not line or line.startswith("AT") or line in ("OK", "?", "NO DATA", "ERROR"):
                continue
            parts = line.split()
            for p in parts:
                try:
                    bytes_out.append(int(p, 16))
                except ValueError:
                    continue
        return bytes_out

    def _check_response(self, expected_sid: int, resp: list[int]) -> None:
        if not resp:
            raise UDSError(0x00, "Empty response from ECU")
        if resp[0] == self.NEGATIVE_RESPONSE_SID and len(resp) >= 3:
            raise UDSError(resp[2])
        expected = expected_sid + self.POSITIVE_RESPONSE_OFFSET
        if resp[0] != expected:
            raise UDSError(0x10, f"Unexpected response SID: 0x{resp[0]:02X}")

    def _keepalive(self) -> None:
        while self._keepalive_active:
            try:
                self._send([SID_TESTER_PRESENT, 0x00])
            except Exception:
                pass
            time.sleep(2.0)

    def _start_keepalive(self) -> None:
        self._keepalive_active = True
        self._keepalive_thread = threading.Thread(target=self._keepalive, daemon=True)
        self._keepalive_thread.start()

    def _stop_keepalive(self) -> None:
        self._keepalive_active = False
        if self._keepalive_thread:
            self._keepalive_thread.join(timeout=3)
