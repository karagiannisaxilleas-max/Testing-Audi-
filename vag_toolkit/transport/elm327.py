"""
ELM327 transport layer — communicates with the car over serial (USB) or
Bluetooth ELM327 adapters using raw AT commands + hex OBD frames.
"""

import re
import time
import serial
from typing import Optional


class ELM327Error(Exception):
    pass


class ELM327:
    """
    Low-level ELM327 driver.

    Usage:
        elm = ELM327("/dev/ttyUSB0")   # USB adapter
        elm = ELM327("/dev/rfcomm0")   # paired Bluetooth adapter
        elm.connect()
        raw = elm.send_raw("09 02")    # request VIN mode 9 PID 2
        elm.close()
    """

    BAUD_RATES = [38400, 9600, 115200, 57600, 19200]
    TIMEOUT = 5.0

    def __init__(self, port: str, baudrate: int = 38400):
        self.port = port
        self.baudrate = baudrate
        self._serial: Optional[serial.Serial] = None
        self.protocol: Optional[str] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def connect(self) -> None:
        self._serial = serial.Serial(
            self.port,
            baudrate=self.baudrate,
            timeout=self.TIMEOUT,
        )
        self._init_elm()

    def close(self) -> None:
        if self._serial and self._serial.is_open:
            self._serial.close()

    def send_raw(self, command: str) -> str:
        """Send a hex OBD command, return the raw string response."""
        self._write(command)
        return self._read_until_prompt()

    def at(self, cmd: str) -> str:
        """Send an AT command (e.g. 'ATZ'), return response."""
        self._write(f"AT{cmd}")
        return self._read_until_prompt()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _init_elm(self) -> None:
        self._write("ATZ")
        time.sleep(1.2)
        self._serial.reset_input_buffer()

        self.at("E0")   # echo off
        self.at("L0")   # linefeeds off
        self.at("S0")   # spaces off in responses
        self.at("H1")   # headers on (we need them for multi-ECU)
        self.at("SP6")  # ISO 15765-4 CAN 11-bit, 500 kbps (VAG standard)
        self.at("ST FF")  # timeout 255 * 4 ms = ~1 s

    def _write(self, data: str) -> None:
        if not self._serial or not self._serial.is_open:
            raise ELM327Error("Not connected")
        self._serial.write((data.strip() + "\r").encode())

    def _read_until_prompt(self) -> str:
        buf = b""
        deadline = time.time() + self.TIMEOUT
        while time.time() < deadline:
            chunk = self._serial.read(self._serial.in_waiting or 1)
            if chunk:
                buf += chunk
                if b">" in buf:
                    break
        text = buf.decode(errors="replace").replace("\r", "\n").strip()
        text = re.sub(r"\s*>\s*$", "", text).strip()
        return text

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, *_):
        self.close()
