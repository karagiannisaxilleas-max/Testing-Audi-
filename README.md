# Android Auto Unlock — 2021 Audi e-tron S (MIB3)

**Vehicle:** Audi e-tron S  
**VIN:** WAUZZZGE8MB044371  
**Year:** 2021  
**Infotainment:** MIB3 (MMI Navigation plus)  
**Tool:** OBD Eleven

---

## Prerequisites

- OBD Eleven Pro app (Android/iOS) with a valid OBD11 connector
- Car ignition **ON** (engine/drive-ready not required)
- Battery voltage above 12.5 V — connect a charger if needed
- At least 1 OBD11 credit for each adaptation write (2 total for the standard unlock)

---

## Unlock Procedure

### Step 1 — Connect

1. Plug the OBD11 dongle into the OBD-II port (driver's side, under the dashboard).
2. Open the OBD Eleven app and connect to the car.
3. Tap **Adaptations**.

---

### Step 2 — Module 5F (Information Electronics 1)

Navigate to:

```
Adaptations → 5F Information Electronics 1
```

#### Adaptation 1 — Enable Android Auto menu

| Field | Value |
|-------|-------|
| Group | `Car_Function_Adaptations_Gen2` |
| Channel | `menu_display_androidauto` |
| Current value | `not_activated` |
| **New value** | **`activated`** |

Save and confirm (costs 1 credit).

---

#### Adaptation 2 — Activate Android Auto in BAP function list

| Field | Value |
|-------|-------|
| Group | `Car_Function_List_BAP_Gen2` |
| Channel | `AndroidAuto` |
| Current value | `not_activated` |
| **New value** | **`activated`** |

Save and confirm (costs 1 credit).

---

### Step 3 — Optional: Wireless Android Auto

If your phone supports Wireless AA and the head unit has Wi-Fi Direct capability:

| Field | Value |
|-------|-------|
| Group | `Car_Function_Adaptations_Gen2` |
| Channel | `menu_display_androidauto_wireless` |
| Current value | `not_activated` |
| **New value** | **`activated`** |

> Not all 2021 e-tron S units support wireless AA. Skip if the channel is absent.

---

### Step 4 — Verify

1. Disconnect the OBD11 dongle.
2. Cycle the ignition off for 30 seconds, then back on.
3. On the MMI home screen go to **Apps** — the Android Auto tile should now appear.
4. Connect your Android phone via USB; follow the on-screen pairing prompt.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Channel not found in 5F | Confirm MIB3 firmware; try a full scan first |
| Adaptation write fails | Check battery voltage; retry with ignition in ACC mode |
| AA icon appears but won't connect | Enable USB debugging on the phone is **not** required — ensure the USB cable supports data (not charge-only) |
| MMI freezes after adaptation | Perform a soft reset: hold the MMI knob + top-left home button for 10 s |

---

## Notes

- This modification activates a feature that is already present in the MIB3 hardware but may be region/market locked in software.
- Adaptations are reversible — set the channels back to `not_activated` to undo.
- OBD11 logs each adaptation change; export the log before and after for reference.
