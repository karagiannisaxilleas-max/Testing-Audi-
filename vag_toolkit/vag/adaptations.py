"""
VAG adaptation reader/writer using OBD11-style channel names.

On MIB3 (module 5F), adaptations are accessed via UDS 0x2C/0x2E with
VAG-proprietary data identifiers mapped to human-readable channel names.
"""

from dataclasses import dataclass, field
from typing import Optional
from ..uds.client import UDSClient, UDSError
from ..uds.constants import SESSION_EXTENDED, SA_REQUEST_SEED_LEVEL_03
from .security import get_key_fn


# Known adaptation data identifiers for module 5F (MIB3)
# Format: channel_name -> (data_id, encoding)
MIB3_ADAPTATIONS: dict[str, tuple[int, str]] = {
    # function_configuration_connectivity
    "google_android_auto":          (0xFD3C, "enum"),
    "apple_car_play":               (0xFD3B, "enum"),
    "app_connect_over_wifi":        (0xFD3D, "bool"),
    "wifi_client_mode_2_GHz":       (0xFD40, "bool"),
    "wifi_client_mode_5GHz":        (0xFD41, "bool"),
    "wlan_module":                  (0xFD38, "enum"),
    "Mirror_link":                  (0xFD3E, "enum"),
    # function_configuration_phone
    "LTE_modul":                    (0xFD50, "enum"),
    "phone_nad":                    (0xFD51, "enum"),
    # Smartphone_configuration
    "Google_android_auto_wireless": (0xFD60, "bool"),
    "Apple_car_play_wireless":      (0xFD61, "bool"),
    # SWaP / FoD
    "swap_function_select":         (0xFDAA, "raw"),
    "swap_release_code":            (0xFDAB, "raw"),
}

ENUM_VALUES = {
    "On":            b"\x01",
    "Off":           b"\x00",
    "installed":     b"\x01",
    "not_installed": b"\x00",
    "activated":     b"\x01",
    "not_activated": b"\x00",
    "USB_only":      b"\x02",
}

BOOL_VALUES = {
    "Yes": b"\x01",
    "No":  b"\x00",
    "On":  b"\x01",
    "Off": b"\x00",
}


@dataclass
class AdaptationResult:
    channel: str
    data_id: int
    raw: bytes
    value: str = ""
    error: Optional[str] = None


class AdaptationManager:
    """
    Read and write MIB3 adaptations by channel name.

    Example:
        mgr = AdaptationManager(elm, module="5F")
        result = mgr.read("google_android_auto")
        print(result.value)   # "On" or "Off"
        mgr.write("google_android_auto", "On")
    """

    def __init__(self, elm, module: str = "5F"):
        from ..transport.elm327 import ELM327
        self._elm = elm
        self._module = module.upper()
        self._client = UDSClient(elm, module)

    def open_session(self) -> None:
        self._client.start_session(SESSION_EXTENDED)
        key_fn = get_key_fn(self._module)
        try:
            self._client.security_access(SA_REQUEST_SEED_LEVEL_03, key_fn)
        except UDSError as e:
            # Security access may not be required for read-only; continue
            if e.nrc not in (0x22, 0x31):
                raise

    def close(self) -> None:
        self._client.close()

    def read(self, channel: str) -> AdaptationResult:
        entry = MIB3_ADAPTATIONS.get(channel)
        if not entry:
            return AdaptationResult(channel, 0, b"", error="Unknown channel")
        data_id, encoding = entry
        try:
            raw = self._client.read_data(data_id)
            value = self._decode(raw, encoding)
            return AdaptationResult(channel, data_id, raw, value)
        except UDSError as e:
            return AdaptationResult(channel, data_id, b"", error=str(e))

    def write(self, channel: str, value: str) -> AdaptationResult:
        entry = MIB3_ADAPTATIONS.get(channel)
        if not entry:
            return AdaptationResult(channel, 0, b"", error="Unknown channel")
        data_id, encoding = entry
        raw = self._encode(value, encoding)
        try:
            self._client.write_data(data_id, raw)
            return AdaptationResult(channel, data_id, raw, value)
        except UDSError as e:
            return AdaptationResult(channel, data_id, raw, error=str(e))

    def read_all(self) -> list[AdaptationResult]:
        results = []
        for channel in MIB3_ADAPTATIONS:
            results.append(self.read(channel))
        return results

    def _decode(self, raw: bytes, encoding: str) -> str:
        if not raw:
            return "empty"
        b = raw[0]
        if encoding == "bool":
            return "Yes" if b else "No"
        if encoding == "enum":
            if b == 0x00:
                return "Off / not_installed"
            if b == 0x01:
                return "On / installed"
            if b == 0x02:
                return "USB_only"
            return f"0x{b:02X}"
        return raw.hex()

    def _encode(self, value: str, encoding: str) -> bytes:
        if encoding == "bool":
            return BOOL_VALUES.get(value, b"\x00")
        if encoding == "enum":
            return ENUM_VALUES.get(value, b"\x00")
        # raw: value is a hex string like "01" or "01 02 03"
        return bytes.fromhex(value.replace(" ", ""))
