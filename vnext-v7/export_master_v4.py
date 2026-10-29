"""Export a SHA-pinned read-only KBV course master metadata snapshot for the browser.

No database modifications. This is NOT a 3D geometry export.
"""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path


def strict_json(text):
    def unique(pairs):
        d = {}
        for k, v in pairs:
            if k in d:
                raise ValueError("duplicate pointer key: " + k)
            d[k] = v
        return d
    return json.loads(text, object_pairs_hook=unique)


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--project-root", type=Path, required=True)
    cli.add_argument("--output", type=Path, required=True)
    args = cli.parse_args()
    data = args.project_root / "data"
    pointer_path = data / "CURRENT_REFERENCE.json"
    pin = strict_json(pointer_path.read_text("ascii"))
    if set(pin) != {"basename", "sha256", "version"} or pin["version"] != 4 or pin["basename"] != "kbv_reference.sqlite":
        raise ValueError("unsupported or malformed CURRENT_REFERENCE")
    db = data / pin["basename"]
    actual_sha = hashlib.sha256(db.read_bytes()).hexdigest()
    if actual_sha != pin["sha256"]:
        raise ValueError("course master SHA mismatch")
    c = sqlite3.connect(db.resolve().as_uri() + "?mode=ro&immutable=1", uri=True)
    c.row_factory = sqlite3.Row
    try:
        if c.execute("PRAGMA user_version").fetchone()[0] != 4:
            raise ValueError("wrong SQLite schema")
        if c.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite integrity check failed")
        if c.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("broken foreign keys")
        rows = [dict(x) for x in c.execute("""
            SELECT venue_code,surface,course_variant,distance_m,
                   effective_from_ymd,effective_to_ymd,jv_track_code,corner_count,
                   verification_status,jra_official_url,jra_diagram_url
            FROM course_master
            ORDER BY venue_code,surface,course_variant,distance_m
        """)]
        if len(rows) != 134:
            raise ValueError("unexpected count: " + str(len(rows)))
        for row in rows:
            if row["verification_status"] not in ("JRA_DIRECT_COUNT", "JRA_ROUTE_DERIVED"):
                raise ValueError("unverified course row: " + str(row))
    finally:
        c.close()
    if pointer_path.read_text("ascii") != json.dumps(pin, ensure_ascii=True, indent=2, sort_keys=True) + "\n":
        # Do not assume formatting of the pointer; reparse the actual latest file.
        latest = strict_json(pointer_path.read_text("ascii"))
        if latest != pin:
            raise ValueError("CURRENT_REFERENCE changed during export")
    obj = {"schema": "kbv.scene03.master-snapshot/v1",
           "source_version": 4, "source_sha256": actual_sha, "rows": rows}
    text = "/* SHA-pinned metadata exported from KBV official course master; not geometric survey data. */\n"
    text += "window.KBV_COURSE_MASTER_SNAPSHOT = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n"
    args.output.open("x", encoding="utf-8", newline="\n").write(text)
    print(json.dumps({"output": str(args.output), "rows": len(rows), "master_sha": actual_sha}))


if __name__ == "__main__":
    main()
