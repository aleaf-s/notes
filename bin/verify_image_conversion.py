"""Verify converted WebP pixels against the PNG versions stored in Git HEAD."""

from __future__ import annotations

import io
import subprocess
from pathlib import Path

from PIL import Image


def git_output(*arguments: str) -> bytes:
    return subprocess.run(["git", *arguments], check=True, stdout=subprocess.PIPE).stdout


def main() -> None:
    repo = Path(__file__).resolve().parent.parent
    deleted = git_output("diff", "--name-only", "--diff-filter=D", "-z", "--", "assets").decode("utf-8").split("\0")
    candidates = [path for path in deleted if path.lower().endswith(".png") and (repo / Path(path).with_suffix(".webp")).exists()]
    mismatches: list[str] = []
    originals_with_icc: list[str] = []

    for png_path in candidates:
        original_bytes = git_output("show", f"HEAD:{png_path}")
        with Image.open(io.BytesIO(original_bytes)) as original, Image.open(repo / Path(png_path).with_suffix(".webp")) as converted:
            if original.info.get("icc_profile"):
                originals_with_icc.append(png_path)
            if original.size != converted.size or original.convert("RGBA").tobytes() != converted.convert("RGBA").tobytes():
                mismatches.append(png_path)

    print(f"Compared {len(candidates)} converted image(s); pixel mismatches: {len(mismatches)}; originals with ICC profiles: {len(originals_with_icc)}.")
    for path in mismatches:
        print(f"MISMATCH: {path}")
    for path in originals_with_icc:
        print(f"ICC_PROFILE: {path}")
    raise SystemExit(1 if mismatches else 0)


if __name__ == "__main__":
    main()
