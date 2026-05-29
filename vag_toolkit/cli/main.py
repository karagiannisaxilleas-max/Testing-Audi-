#!/usr/bin/env python3
"""
VAG Toolkit CLI — interactive shell for your Audi e-tron S.

Usage:
    python -m vag_toolkit.cli.main --port /dev/ttyUSB0
    python -m vag_toolkit.cli.main --port /dev/rfcomm0   # Bluetooth adapter

Commands (at the prompt):
    scan              Scan all modules on the CAN bus
    read  <channel>   Read an adaptation channel from module 5F
    write <channel> <value>   Write an adaptation channel
    fod list          List FoD functions and their activation status
    fod activate <id> <code>  Activate a FoD feature with a release code
    android           One-shot: unlock Android Auto (all channels)
    exit / quit       Exit
"""

import argparse
import sys
import readline  # noqa: F401 — enables up-arrow history
from typing import Optional

from ..transport.elm327 import ELM327, ELM327Error
from ..vag.scanner import ModuleScanner
from ..vag.adaptations import AdaptationManager
from ..vag.fod import FoDManager


ANDROID_AUTO_CHANNELS = {
    "google_android_auto":          "On",
    "apple_car_play":               "On",
    "app_connect_over_wifi":        "Yes",
    "wifi_client_mode_2_GHz":       "On",
    "wifi_client_mode_5GHz":        "On",
    "Google_android_auto_wireless": "On",
    "Apple_car_play_wireless":      "On",
}

BANNER = """
╔══════════════════════════════════════════════════╗
║         VAG Toolkit — Audi e-tron S              ║
║         2021 · MIB3 · VIN WAUZZZGE8MB044371      ║
╚══════════════════════════════════════════════════╝
Type 'help' for available commands.
"""


def parse_args():
    p = argparse.ArgumentParser(description="VAG Toolkit CLI")
    p.add_argument("--port", required=True, help="Serial port (e.g. /dev/ttyUSB0 or COM3)")
    p.add_argument("--baud", type=int, default=38400)
    p.add_argument("--module", default="5F", help="Default ECU module (default: 5F)")
    return p.parse_args()


def cmd_scan(elm: ELM327) -> None:
    print("\nScanning CAN bus for modules...")
    scanner = ModuleScanner(elm)
    results = scanner.scan()
    found = [r for r in results if r.responding]
    print(f"\n{'Module':<8} {'CAN ID':<10} {'Name'}")
    print("-" * 50)
    for r in results:
        status = "✓" if r.responding else "·"
        print(f"  {status}  {r.module_id:<6} 0x{r.can_id:03X}      {r.name}")
    print(f"\n{len(found)} modules responding.\n")


def cmd_read(elm: ELM327, module: str, channel: str) -> None:
    mgr = AdaptationManager(elm, module)
    try:
        mgr.open_session()
        result = mgr.read(channel)
        if result.error:
            print(f"  Error: {result.error}")
        else:
            print(f"  {channel}: {result.value}  (raw: {result.raw.hex()})")
    finally:
        mgr.close()


def cmd_write(elm: ELM327, module: str, channel: str, value: str) -> None:
    mgr = AdaptationManager(elm, module)
    try:
        mgr.open_session()
        result = mgr.write(channel, value)
        if result.error:
            print(f"  Error: {result.error}")
        else:
            print(f"  OK — {channel} set to {value}")
    finally:
        mgr.close()


def cmd_android_auto(elm: ELM327, module: str) -> None:
    print("\nUnlocking Android Auto on module 5F...")
    mgr = AdaptationManager(elm, module)
    try:
        mgr.open_session()
        for channel, value in ANDROID_AUTO_CHANNELS.items():
            result = mgr.write(channel, value)
            status = "OK" if not result.error else f"FAIL ({result.error})"
            print(f"  [{status}] {channel} → {value}")
    finally:
        mgr.close()
    print("\nDone. Perform a soft MMI reboot (hold power button) to apply.\n")


def cmd_fod(elm: ELM327, module: str, args: list[str]) -> None:
    mgr = FoDManager(elm, module)
    try:
        mgr.open_session()
        if not args or args[0] == "list":
            functions = mgr.list_functions()
            print(f"\n{'ID':<6} {'Active':<8} {'Name'}")
            print("-" * 50)
            for fn in functions:
                active = "YES" if fn.active else "no"
                print(f"  0x{fn.function_id:02X}   {active:<8} {fn.name}")
            print()
        elif args[0] == "activate" and len(args) >= 3:
            fid = int(args[1], 16) if args[1].startswith("0x") else int(args[1])
            code = args[2]
            print(f"\nActivating function 0x{fid:02X} with code: {code}")
            result = mgr.activate(fid, code)
            print(f"  {'Success' if result.success else 'Failed'}: {result.message}\n")
        else:
            print("  Usage: fod list | fod activate <id> <code>")
    finally:
        mgr.close()


def cmd_help() -> None:
    print("""
Commands:
  scan                        Scan CAN bus for responding modules
  read  <channel>             Read adaptation channel from active module
  write <channel> <value>     Write adaptation channel
  fod list                    List FoD functions and activation status
  fod activate <id> <code>    Activate FoD feature with release code
  android                     Unlock all Android Auto channels at once
  module <id>                 Switch active module (default: 5F)
  help                        Show this help
  exit / quit                 Exit

Examples:
  read google_android_auto
  write google_android_auto On
  fod list
  fod activate 0x01 MYRELEASECODE123456
  android
""")


def repl(elm: ELM327, default_module: str) -> None:
    print(BANNER)
    module = default_module

    while True:
        try:
            line = input(f"vag[{module}]> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if not line:
            continue

        parts = line.split()
        cmd = parts[0].lower()

        if cmd in ("exit", "quit"):
            break
        elif cmd == "help":
            cmd_help()
        elif cmd == "scan":
            cmd_scan(elm)
        elif cmd == "read" and len(parts) >= 2:
            cmd_read(elm, module, parts[1])
        elif cmd == "write" and len(parts) >= 3:
            cmd_write(elm, module, parts[1], parts[2])
        elif cmd == "android":
            cmd_android_auto(elm, module)
        elif cmd == "fod":
            cmd_fod(elm, module, parts[1:])
        elif cmd == "module" and len(parts) >= 2:
            module = parts[1].upper()
            print(f"  Active module: {module}")
        else:
            print("  Unknown command. Type 'help'.")


def main() -> None:
    args = parse_args()
    try:
        with ELM327(args.port, args.baud) as elm:
            repl(elm, args.module)
    except ELM327Error as e:
        print(f"Connection error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
