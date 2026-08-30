"""Losslessly compress screenshots and report machine-readable results."""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True


def emit(kind: str, *values: object) -> None:
    safe = [str(value).replace("|", "_") for value in values]
    print("|".join([kind, *safe]))


def main() -> None:
    root = Path(sys.argv[1])
    target = Path(sys.argv[2])
    min_bytes = int(sys.argv[3]) * 1024
    min_ratio = 1.0 - int(sys.argv[4]) / 100.0
    what_if = sys.argv[5] == "1"
    keep_originals = sys.argv[6] == "1"
    make_backup = sys.argv[7] == "1"
    lossy_photos = sys.argv[8] == "1"

    for source in target.rglob("*"):
        if not source.is_file() or source.suffix.lower() not in (".png", ".jpg", ".jpeg"):
            continue
        original_size = source.stat().st_size
        if original_size < min_bytes:
            continue

        relative_source = source.relative_to(root).as_posix()
        try:
            with Image.open(source) as image:
                if source.suffix.lower() == ".png":
                    webp_path = source.with_suffix(".webp")
                    temp_webp = Path(f"{webp_path}.tmp")
                    image.save(temp_webp, "WEBP", lossless=True, method=6, exact=True)
                    webp_size = temp_webp.stat().st_size

                    if webp_size <= original_size * min_ratio:
                        relative_webp = webp_path.relative_to(root).as_posix()
                        emit("PLAN" if what_if else "CONVERTED", relative_source, relative_webp, original_size, webp_size)
                        if what_if:
                            temp_webp.unlink()
                            continue
                        backup_if_requested(source, root, relative_source, make_backup)
                        os.replace(temp_webp, webp_path)
                        if not keep_originals:
                            source.unlink()
                        continue

                    temp_webp.unlink()
                    temp_png = Path(f"{source}.tmp.png")
                    image.save(temp_png, "PNG", optimize=True, compress_level=9)
                    optimized_size = temp_png.stat().st_size
                    if optimized_size < original_size * 0.98:
                        emit("PLAN_PNG" if what_if else "OPTIMIZED", relative_source, relative_source, original_size, optimized_size)
                        if what_if:
                            temp_png.unlink()
                        else:
                            backup_if_requested(source, root, relative_source, make_backup)
                            os.replace(temp_png, source)
                    else:
                        temp_png.unlink()
                        emit("SKIPPED", relative_source, relative_source, original_size, original_size)

                elif lossy_photos:
                    webp_path = source.with_suffix(".webp")
                    temp_webp = Path(f"{webp_path}.tmp")
                    image.convert("RGB").save(temp_webp, "WEBP", quality=90, method=6)
                    webp_size = temp_webp.stat().st_size
                    if webp_size <= original_size * min_ratio:
                        relative_webp = webp_path.relative_to(root).as_posix()
                        emit("PLAN" if what_if else "CONVERTED", relative_source, relative_webp, original_size, webp_size)
                        if what_if:
                            temp_webp.unlink()
                        else:
                            backup_if_requested(source, root, relative_source, make_backup)
                            os.replace(temp_webp, webp_path)
                            if not keep_originals:
                                source.unlink()
                    else:
                        temp_webp.unlink()
                        emit("SKIPPED", relative_source, relative_source, original_size, original_size)
                else:
                    emit("SKIPPED_JPEG", relative_source, relative_source, original_size, original_size)
        except Exception as error:  # Keep the batch going and report all failures.
            emit("ERROR", relative_source, relative_source, original_size, error)


def backup_if_requested(source: Path, root: Path, relative_source: str, enabled: bool) -> None:
    if not enabled:
        return
    backup = root / "tmp" / "compress-backup" / Path(relative_source)
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(source, backup)


if __name__ == "__main__":
    main()
