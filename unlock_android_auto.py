#!/usr/bin/env python3
"""
Interactive checklist for unlocking Android Auto on a 2021 Audi e-tron S
via OBD Eleven. Run this on your phone/laptop alongside the OBD11 app as
a step-by-step guide with progress tracking.
"""

import sys

VEHICLE = {
    "make": "Audi",
    "model": "e-tron S",
    "year": 2021,
    "vin": "WAUZZZGE8MB044371",
    "infotainment": "MIB3",
}

ADAPTATIONS = [
    {
        "id": 1,
        "required": True,
        "module": "5F Information Electronics 1",
        "group": "Car_Function_Adaptations_Gen2",
        "channel": "menu_display_androidauto",
        "from_value": "not_activated",
        "to_value": "activated",
        "credits": 1,
        "description": "Enable Android Auto menu entry in MMI",
    },
    {
        "id": 2,
        "required": True,
        "module": "5F Information Electronics 1",
        "group": "Car_Function_List_BAP_Gen2",
        "channel": "AndroidAuto",
        "from_value": "not_activated",
        "to_value": "activated",
        "credits": 1,
        "description": "Activate Android Auto in BAP function list",
    },
    {
        "id": 3,
        "required": False,
        "module": "5F Information Electronics 1",
        "group": "Car_Function_Adaptations_Gen2",
        "channel": "menu_display_androidauto_wireless",
        "from_value": "not_activated",
        "to_value": "activated",
        "credits": 1,
        "description": "Enable Wireless Android Auto (skip if channel absent)",
    },
]


def hr(char="-", width=60):
    print(char * width)


def header():
    hr("=")
    print(f"  Android Auto Unlock — {VEHICLE['year']} {VEHICLE['make']} {VEHICLE['model']}")
    print(f"  VIN : {VEHICLE['vin']}")
    print(f"  MMI : {VEHICLE['infotainment']}")
    hr("=")
    print()


def prompt_yn(question: str, default: bool = True) -> bool:
    hint = "[Y/n]" if default else "[y/N]"
    while True:
        answer = input(f"{question} {hint}: ").strip().lower()
        if answer in ("", "y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("  Please enter y or n.")


def pre_flight():
    print("PRE-FLIGHT CHECKS")
    hr()
    checks = [
        "OBD11 dongle plugged into OBD-II port",
        "OBD Eleven app connected to vehicle",
        "Ignition ON (not necessarily drive-ready)",
        "Battery voltage above 12.5 V",
        f"At least {sum(a['credits'] for a in ADAPTATIONS if a['required'])} OBD11 credits available",
    ]
    for check in checks:
        ok = prompt_yn(f"  ✓ {check}?")
        if not ok:
            print("\n  Complete all pre-flight checks before continuing.")
            sys.exit(1)
    print()


def run_adaptation(adaptation: dict) -> bool:
    tag = "(required)" if adaptation["required"] else "(optional)"
    hr()
    print(f"STEP {adaptation['id']} — {adaptation['description']} {tag}")
    hr()
    print(f"  Module  : {adaptation['module']}")
    print(f"  Group   : {adaptation['group']}")
    print(f"  Channel : {adaptation['channel']}")
    print(f"  Change  : {adaptation['from_value']}  →  {adaptation['to_value']}")
    print(f"  Credits : {adaptation['credits']}")
    print()

    if not adaptation["required"]:
        if not prompt_yn("  Apply this optional adaptation?", default=False):
            print("  Skipped.\n")
            return False

    input("  Navigate to this channel in OBD11, then press Enter when ready... ")
    done = prompt_yn(f"  Saved '{adaptation['to_value']}' successfully?")
    if done:
        print("  Done.\n")
    else:
        print("  Marked as skipped/failed.\n")
    return done


def post_steps():
    hr("=")
    print("POST-ADAPTATION STEPS")
    hr()
    steps = [
        "Disconnect the OBD11 dongle",
        "Turn ignition OFF and wait 30 seconds",
        "Turn ignition ON",
        "Open MMI → Apps — verify Android Auto tile appears",
        "Connect Android phone via data-capable USB cable",
    ]
    for i, step in enumerate(steps, 1):
        input(f"  {i}. {step} — press Enter when done... ")
    print()


def main():
    header()

    pre_flight()

    results = []
    for adaptation in ADAPTATIONS:
        success = run_adaptation(adaptation)
        results.append((adaptation, success))

    post_steps()

    hr("=")
    print("SUMMARY")
    hr()
    required_ok = all(
        success for adaptation, success in results if adaptation["required"]
    )
    for adaptation, success in results:
        status = "OK" if success else "SKIP"
        tag = "*" if adaptation["required"] else " "
        print(f"  [{status}] {tag} Step {adaptation['id']}: {adaptation['channel']}")

    print()
    if required_ok:
        print("  All required adaptations applied. Android Auto should now be active.")
    else:
        print("  One or more required adaptations were not applied. Review and retry.")
    hr("=")


if __name__ == "__main__":
    main()
