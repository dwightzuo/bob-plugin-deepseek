#!/usr/bin/env python3
"""Build a reproducible Bob plugin from an explicit file allowlist."""

import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = ("info.json", "main.js", "LICENSE")


def build():
    metadata = json.loads((ROOT / "info.json").read_text(encoding="utf-8"))
    api_key = next(option for option in metadata["options"] if option["identifier"] == "apiKey")
    if api_key.get("defaultValue") != "":
        raise ValueError("The API key default must be empty.")
    version = metadata["version"]
    if not version or any(char not in "0123456789." for char in version):
        raise ValueError("Invalid package version.")
    target = ROOT / ("deepseek-" + version + ".bobplugin")
    target.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, (ROOT / name).read_bytes())
    print(target.relative_to(ROOT))
    return target


if __name__ == "__main__":
    build()
