"""Export only the official KBV v5 course master metadata, using a strict SHA-pinned
read-only SQLite snapshot. This is NOT 3D terrain / surveyed geometry.
"""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

EXPECTED_VERSION = 5
EXPECTED_ROWS = 134
COLUMNS = (
    "venue_code", "surface", "course_variant", "distance_m",
    "jv_track_code", "corner_count", "verification_status",
    "jra_official_url", "jra_diagram_url", "evidence_basis",
    "source_authority", "reviewed_utc",
)
STATUS = {"JRA_DIRECT_COUNT", "JRA_ROUTE_DERIVED", "JRA_ROUTE_ONLY"}

def strict_json(raw):
    def unique(pairs):
        obj = {}
        for k, v in pairs:
            if k in obj:
                raise ValueError("duplicate JSON key: "+k)
            obj[k] = v
        return obj
    return json.loads(raw, object_pairs_hook=unique)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = args.project_root / "data"
    pointer_file = data / "CURRENT_REFERENCE.json"
    pin = strict_json(pointer_file.read_text(encoding="utf-8"))
    if set(pin) != {"basename","sha256","version"} or pin["version"] != EXPECTED_VERSION or pin["basename"] != "kbv_reference.sqlite":
        raise ValueError("expected the published v5 course master pointer")
    db = data / pin["basename"]
    actual_sha = hashlib.sha256(db.read_bytes()).hexdigest()
    if pin["sha256"] != actual_sha:
        raise ValueError("CURRENT_REFERENCE sha256 mismatch")
    conn = sqlite3.connect(db.resolve().as_uri()+"?mode=ro&immutable=1",uri=True)
    conn.row_factory = sqlite3.Row
    try:
        if conn.execute("PRAGMA user_version").fetchone()[0] != EXPECTED_VERSION:
            raise ValueError("SQLite user_version differs")
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok" or list(conn.execute("PRAGMA foreign_key_check")):
            raise ValueError("SQLite integrity failure")
        names = tuple(r["name"] for r in conn.execute("PRAGMA table_info(course_master)"))
        if names != COLUMNS:
            raise ValueError("Unexpected v5 course master columns: "+repr(names))
        sql = "SELECT "+",".join(COLUMNS)+" FROM course_master ORDER BY venue_code,surface,course_variant,distance_m"
        rows = [dict(r) for r in conn.execute(sql)]
        if len(rows) != EXPECTED_ROWS:
            raise ValueError("Unexpected course master row count")
        keys = set()
        for row in rows:
            key = tuple(row[k] for k in ("venue_code","surface","course_variant","distance_m"))
            if key in keys:
                raise ValueError("Duplicate course primary key")
            keys.add(key)
            if row["verification_status"] not in STATUS:
                raise ValueError("Unexpected verification status")
            if row["verification_status"] != "JRA_ROUTE_ONLY" and row["corner_count"] is None:
                raise ValueError("Verified course without corner count")
    finally:
        conn.close()
    latest = strict_json(pointer_file.read_text(encoding="utf-8"))
    if latest != pin or hashlib.sha256(db.read_bytes()).hexdigest() != actual_sha:
        raise ValueError("Reference changed during export")
    doc = {"schema":"kbv.scene03.master-snapshot/v2","source_version":EXPECTED_VERSION,
        "source_sha256":actual_sha,"rows":rows}
    text = "/* Read-only export from published KBV v5 course master; no surveyed geometry. */\n"
    text += "window.KBV_COURSE_MASTER_SNAPSHOT = "+json.dumps(doc,ensure_ascii=False,separators=(",",":"))+";\n"
    with args.output.open("x",encoding="utf-8",newline="\n") as out:
        out.write(text)
    print(json.dumps({"version":EXPECTED_VERSION,"rows":len(rows),
        "sha256":actual_sha,"output":str(args.output)}))

if __name__ == "__main__":
    main()
