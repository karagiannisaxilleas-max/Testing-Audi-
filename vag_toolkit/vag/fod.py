"""
FoD (Function on Demand) / SWaP handler for VAG MIB3.

The SWaP system works like this:
  1. Read the list of available FoD functions from the ECU
  2. Select the function you want to activate
  3. Submit a release code (VIN-bound token from Audi's server)
  4. ECU validates the code and unlocks the feature

This module handles steps 1-2 and provides the infrastructure for step 3.
Step 3 requires a valid release code — see FoDCode.generate() for what we know
about the code format, and docs/fod_research.md for ongoing reverse engineering.
"""

from dataclasses import dataclass
from typing import Optional
from ..uds.client import UDSClient, UDSError
from ..uds.constants import SESSION_EXTENDED, SA_REQUEST_SEED_LEVEL_03
from .security import get_key_fn

# Known FoD function identifiers on MIB3
FOD_FUNCTIONS = {
    0x01: "Smartphone Interface (Android Auto + CarPlay)",
    0x02: "Wireless Smartphone Interface",
    0x03: "Online Traffic Information",
    0x04: "Audi Music Streaming",
    0x05: "Audi Navigation Plus",
    0x10: "Sport Sound",
    0x11: "Adaptive Cruise Assist",
}

# UDS data identifiers for SWaP operations on module 5F
DID_SWAP_FUNCTION_LIST     = 0xFDA0   # read: list of available FoD functions
DID_SWAP_FUNCTION_STATUS   = 0xFDA1   # read: activation status per function
DID_SWAP_SELECT_FUNCTION   = 0xFDAA   # write: select function to activate
DID_SWAP_SUBMIT_CODE       = 0xFDAB   # write: submit release code
DID_SWAP_ACTIVATION_RESULT = 0xFDAC   # read: result of last activation attempt


@dataclass
class FoDFunction:
    function_id: int
    name: str
    active: bool = False
    available: bool = True


@dataclass
class FoDResult:
    success: bool
    message: str
    raw: bytes = b""


class FoDManager:
    """
    Manage FoD (Function on Demand) features on MIB3 module 5F.

    Example:
        mgr = FoDManager(elm)
        mgr.open_session()
        functions = mgr.list_functions()
        for fn in functions:
            print(fn.name, "active:", fn.active)
        result = mgr.activate(0x01, "XXXX-XXXX-XXXX-XXXX")
        print(result.message)
        mgr.close()
    """

    def __init__(self, elm, module: str = "5F"):
        self._elm = elm
        self._module = module.upper()
        self._client = UDSClient(elm, module)

    def open_session(self) -> None:
        self._client.start_session(SESSION_EXTENDED)
        key_fn = get_key_fn(self._module)
        self._client.security_access(SA_REQUEST_SEED_LEVEL_03, key_fn)

    def close(self) -> None:
        self._client.close()

    def list_functions(self) -> list[FoDFunction]:
        """Read available FoD functions and their activation status from ECU."""
        functions: list[FoDFunction] = []

        try:
            raw_list = self._client.read_data(DID_SWAP_FUNCTION_LIST)
        except UDSError:
            # Fall back to known list if ECU doesn't expose the list DID
            raw_list = bytes(FOD_FUNCTIONS.keys())

        try:
            raw_status = self._client.read_data(DID_SWAP_FUNCTION_STATUS)
            active_ids = set(raw_status)
        except UDSError:
            active_ids = set()

        for fid in raw_list:
            name = FOD_FUNCTIONS.get(fid, f"Unknown function 0x{fid:02X}")
            functions.append(FoDFunction(
                function_id=fid,
                name=name,
                active=fid in active_ids,
            ))

        return functions

    def activate(self, function_id: int, release_code: str) -> FoDResult:
        """
        Attempt to activate a FoD feature using a release code.

        The release code is a VIN-bound token from Audi's licensing server.
        Format: alphanumeric string, typically 20 chars (e.g. from myAudi store
        or a third-party coding service).
        """
        # Step 1: Select the function
        try:
            self._client.write_data(
                DID_SWAP_SELECT_FUNCTION,
                bytes([function_id])
            )
        except UDSError as e:
            return FoDResult(False, f"Failed to select function: {e}")

        # Step 2: Submit the release code
        # Code is submitted as ASCII bytes
        code_bytes = release_code.strip().encode("ascii")
        try:
            self._client.write_data(DID_SWAP_SUBMIT_CODE, code_bytes)
        except UDSError as e:
            return FoDResult(False, f"Code rejected by ECU: {e}", code_bytes)

        # Step 3: Read activation result
        try:
            result_raw = self._client.read_data(DID_SWAP_ACTIVATION_RESULT)
            success = len(result_raw) > 0 and result_raw[0] == 0x01
            msg = "Activation successful" if success else f"Activation failed (ECU returned: {result_raw.hex()})"
            return FoDResult(success, msg, result_raw)
        except UDSError as e:
            return FoDResult(False, f"Could not read activation result: {e}")
