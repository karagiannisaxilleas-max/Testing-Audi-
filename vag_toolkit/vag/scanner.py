"""
Module scanner — discovers which ECUs respond on the CAN bus.
"""

from dataclasses import dataclass
from typing import Optional
from ..transport.elm327 import ELM327
from ..uds.constants import SID_TESTER_PRESENT, VAG_MODULE_CAN

KNOWN_MODULES = {
    "01": "Engine control",
    "02": "Transmission",
    "03": "ABS / ESP",
    "08": "Auto HVAC",
    "09": "Central electrics",
    "15": "Airbag",
    "16": "Steering wheel",
    "17": "Instrument cluster",
    "19": "CAN gateway",
    "25": "Immobiliser",
    "37": "Navigation",
    "44": "Steering assist",
    "46": "Central module comfort",
    "52": "Door driver",
    "53": "Parking brake",
    "5F": "Information electronics (MIB3)",
    "61": "Battery regulation",
    "8C": "Battery management",
    "A5": "Front sensors ADAS",
    "D6": "Onboard charging",
}


@dataclass
class ModuleInfo:
    module_id: str
    name: str
    can_id: int
    responding: bool
    description: str = ""


class ModuleScanner:
    def __init__(self, elm: ELM327):
        self.elm = elm

    def scan(self, modules: Optional[list[str]] = None) -> list[ModuleInfo]:
        """
        Probe each module with a TesterPresent ping and report which ones respond.
        If modules is None, scans all known modules.
        """
        targets = modules or list(KNOWN_MODULES.keys())
        results: list[ModuleInfo] = []

        for mod_id in targets:
            can_id = VAG_MODULE_CAN.get(mod_id)
            if not can_id:
                continue
            name = KNOWN_MODULES.get(mod_id, "Unknown")
            responding = self._ping(can_id)
            results.append(ModuleInfo(
                module_id=mod_id,
                name=name,
                can_id=can_id,
                responding=responding,
            ))

        return results

    def _ping(self, can_id: int) -> bool:
        try:
            self.elm.at(f"SH {can_id:03X}")
            resp = self.elm.send_raw(f"{SID_TESTER_PRESENT:02X} 00")
            # Any non-error response counts as "responding"
            return bool(resp) and "NO DATA" not in resp and "ERROR" not in resp
        except Exception:
            return False
