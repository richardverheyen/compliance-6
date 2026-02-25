#!/usr/bin/env python3
"""
Integration tests for the compliance-6/pipeline setup.

Covers:
- Path constants resolve to compliance-6/data/ (not compliance-7/runs/)
- serve.py FEEDBACK_DIR points into data/
- No excerpts code remains in main.py
- Existing process JSONs in data/ are valid and loadable
- Feedback files in data/feedback/ are valid JSON
"""

import inspect
import json
import socket
import threading
import time
import urllib.request
from pathlib import Path

import pytest

PIPELINE_DIR = Path(__file__).parent
REPO_ROOT = (PIPELINE_DIR / "..").resolve()  # compliance-6/
DATA_DIR = REPO_ROOT / "data"
PROCESSES_DATA_DIR = DATA_DIR / "regulations" / "aml-ctf-rules" / "processes"
FEEDBACK_DATA_DIR = DATA_DIR / "feedback"


# ---------------------------------------------------------------------------
# Path resolution tests
# ---------------------------------------------------------------------------

class TestPathConstants:
    def test_processes_dir_resolves_into_data(self):
        """PROCESSES_DIR in architect.py must resolve to compliance-6/data/..."""
        from architect import PROCESSES_DIR
        assert PROCESSES_DIR == PROCESSES_DATA_DIR, (
            f"PROCESSES_DIR={PROCESSES_DIR!r} does not match {PROCESSES_DATA_DIR!r}"
        )

    def test_feedback_dir_resolves_into_data(self):
        """FEEDBACK_DIR_PATH in architect.py must resolve to compliance-6/data/feedback"""
        from architect import FEEDBACK_DIR_PATH
        assert FEEDBACK_DIR_PATH == FEEDBACK_DATA_DIR, (
            f"FEEDBACK_DIR_PATH={FEEDBACK_DIR_PATH!r} does not match {FEEDBACK_DATA_DIR!r}"
        )

    def test_processes_dir_exists(self):
        from architect import PROCESSES_DIR
        assert PROCESSES_DIR.exists(), f"PROCESSES_DIR does not exist: {PROCESSES_DIR}"

    def test_feedback_dir_exists(self):
        from architect import FEEDBACK_DIR_PATH
        assert FEEDBACK_DIR_PATH.exists(), f"FEEDBACK_DIR_PATH does not exist: {FEEDBACK_DIR_PATH}"

    def test_processes_dir_not_inside_pipeline(self):
        """Output dir must not be inside pipeline/ (no more runs/1/processes)."""
        from architect import PROCESSES_DIR
        assert not str(PROCESSES_DIR).startswith(str(PIPELINE_DIR)), (
            "PROCESSES_DIR should NOT be inside pipeline/"
        )

    def test_processes_dir_not_inside_runs(self):
        """Confirm old runs/1/processes path is not used."""
        from architect import PROCESSES_DIR
        assert "runs" not in PROCESSES_DIR.parts, (
            f"PROCESSES_DIR still points into runs/: {PROCESSES_DIR}"
        )

    def test_serve_feedback_dir_resolves_into_data(self):
        """FEEDBACK_DIR in serve.py must resolve to compliance-6/data/feedback."""
        from serve import FEEDBACK_DIR
        assert Path(FEEDBACK_DIR).resolve() == FEEDBACK_DATA_DIR, (
            f"serve.FEEDBACK_DIR={FEEDBACK_DIR!r} does not match {FEEDBACK_DATA_DIR!r}"
        )

    def test_serve_feedback_dir_not_inside_pipeline(self):
        """serve.FEEDBACK_DIR must not be inside pipeline/ (was runs/1/feedback)."""
        from serve import FEEDBACK_DIR
        assert "runs" not in FEEDBACK_DIR, (
            f"serve.FEEDBACK_DIR still points into runs/: {FEEDBACK_DIR}"
        )


# ---------------------------------------------------------------------------
# No-excerpts tests
# ---------------------------------------------------------------------------

class TestNoExcerpts:
    def test_pdf_scraper_has_no_excerpts_dir_attr(self):
        """PDFScraper.__init__ must not set self.excerpts_dir."""
        from main import PDFScraper
        src = inspect.getsource(PDFScraper.__init__)
        assert "excerpts_dir" not in src, "PDFScraper.__init__ still references excerpts_dir"

    def test_pdf_scraper_has_no_generate_pdf_excerpt(self):
        """_generate_pdf_excerpt method should be removed."""
        from main import PDFScraper
        assert not hasattr(PDFScraper, "_generate_pdf_excerpt"), (
            "PDFScraper._generate_pdf_excerpt still exists"
        )

    def test_main_has_no_regen_excerpts_function(self):
        """run_regen_excerpts function should be removed."""
        import main
        assert not hasattr(main, "run_regen_excerpts"), (
            "run_regen_excerpts still exists in main.py"
        )

    def test_main_argparse_has_no_regen_excerpts_subcommand(self):
        """regen-excerpts subcommand must be gone from CLI."""
        import main
        src = inspect.getsource(main)
        assert "regen-excerpts" not in src, (
            "regen-excerpts subcommand still present in main.py"
        )

    def test_flush_buffer_does_not_call_generate_excerpt(self):
        """flush_buffer closure must not call _generate_pdf_excerpt."""
        from main import PDFScraper
        src = inspect.getsource(PDFScraper.scrape)
        assert "_generate_pdf_excerpt" not in src, (
            "scrape() still calls _generate_pdf_excerpt"
        )


# ---------------------------------------------------------------------------
# Existing process JSON files
# ---------------------------------------------------------------------------

class TestProcessJsonFiles:
    @pytest.fixture(scope="class")
    def process_files(self):
        files = list(PROCESSES_DATA_DIR.glob("*.json"))
        if not files:
            pytest.skip(f"No process JSON files found in {PROCESSES_DATA_DIR}")
        return files

    def test_at_least_ten_process_files_exist(self, process_files):
        assert len(process_files) >= 10, (
            f"Expected ≥10 process files, found {len(process_files)}"
        )

    def test_all_process_files_are_valid_json(self, process_files):
        for f in process_files:
            if f.name.startswith("_"):
                continue  # skip audit/review files
            with open(f) as fh:
                data = json.load(fh)
            assert isinstance(data, dict), f"{f.name} is not a JSON object"

    def test_all_process_files_have_controls_groups_rules(self, process_files):
        for f in process_files:
            if f.name.startswith("_"):
                continue
            with open(f) as fh:
                data = json.load(fh)
            for key in ("controls", "groups", "rules"):
                assert key in data, f"{f.name} missing '{key}'"

    def test_process_ids_match_known_forms(self, process_files):
        """Each JSON filename (minus .json) should match a known process ID in PROCESS_FORMS."""
        from architect import PROCESS_FORMS
        for f in process_files:
            if f.name.startswith("_"):
                continue
            pid = f.stem
            assert pid in PROCESS_FORMS, (
                f"File {f.name} has no matching entry in PROCESS_FORMS"
            )

    def test_control_ids_match_id_regex(self, process_files):
        """All control IDs in process files should match the ID_REGEX convention."""
        from architect import ID_REGEX
        errors = []
        for f in process_files:
            if f.name.startswith("_"):
                continue
            with open(f) as fh:
                data = json.load(fh)
            for ctrl in data.get("controls", []):
                cid = ctrl.get("id", "")
                if not ID_REGEX.match(cid):
                    errors.append(f"{f.name}: invalid control id '{cid}'")
        assert errors == [], "\n".join(errors)

    def test_group_ids_match_slug_regex(self, process_files):
        """All group IDs must be semantic slugs (not 4_x numbers)."""
        from architect import SLUG_REGEX
        errors = []
        for f in process_files:
            if f.name.startswith("_"):
                continue
            with open(f) as fh:
                data = json.load(fh)
            for grp in data.get("groups", []):
                gid = grp.get("id", "")
                if not SLUG_REGEX.match(gid):
                    errors.append(f"{f.name}: invalid group slug '{gid}'")
        assert errors == [], "\n".join(errors)

    def test_rules_only_use_show_effect(self, process_files):
        """Viewer only supports SHOW rules — no HIDE rules allowed."""
        errors = []
        for f in process_files:
            if f.name.startswith("_"):
                continue
            with open(f) as fh:
                data = json.load(fh)
            for rule in data.get("rules", []):
                effect = rule.get("effect")
                if effect != "SHOW":
                    errors.append(
                        f"{f.name}: rule targeting '{rule.get('target')}' has effect='{effect}'"
                    )
        assert errors == [], "\n".join(errors)


# ---------------------------------------------------------------------------
# Feedback JSON files
# ---------------------------------------------------------------------------

class TestFeedbackJsonFiles:
    @pytest.fixture(scope="class")
    def feedback_files(self):
        files = list(FEEDBACK_DATA_DIR.glob("*.json"))
        if not files:
            pytest.skip(f"No feedback JSON files found in {FEEDBACK_DATA_DIR}")
        return files

    def test_all_feedback_files_are_valid_json(self, feedback_files):
        for f in feedback_files:
            with open(f) as fh:
                data = json.load(fh)
            assert isinstance(data, dict), f"{f.name} is not a JSON object"

    def test_feedback_files_not_inside_pipeline(self, feedback_files):
        """Feedback must be read from data/, not from pipeline/runs/."""
        for f in feedback_files:
            assert "pipeline" not in str(f), (
                f"Feedback file found inside pipeline/: {f}"
            )
            assert "runs" not in str(f), (
                f"Feedback file found inside runs/: {f}"
            )


# ---------------------------------------------------------------------------
# serve.py smoke test — start server, hit feedback endpoint
# ---------------------------------------------------------------------------

def _find_free_port() -> int:
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


class TestServeSmoke:
    """Start serve.py's handler in-process and verify feedback GET/POST round-trip."""

    @pytest.fixture(scope="class")
    def server(self, tmp_path_factory):
        """Spin up ComplianceHandler on a free port, backed by a temp feedback dir."""
        import serve as serve_mod

        port = _find_free_port()
        tmp = tmp_path_factory.mktemp("feedback")

        # Patch FEEDBACK_DIR so the server writes to our temp dir, not real data/feedback/
        original = serve_mod.FEEDBACK_DIR
        serve_mod.FEEDBACK_DIR = str(tmp)

        httpd = serve_mod.ReusableServer(("127.0.0.1", port), serve_mod.ComplianceHandler)
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        time.sleep(0.05)

        yield f"http://127.0.0.1:{port}", tmp

        httpd.shutdown()
        serve_mod.FEEDBACK_DIR = original

    def test_get_missing_feedback_returns_empty_object(self, server):
        base_url, _ = server
        resp = urllib.request.urlopen(f"{base_url}/feedback/nonexistent-form")
        assert resp.status == 200
        data = json.loads(resp.read())
        assert data == {}

    def test_post_then_get_feedback_round_trip(self, server):
        base_url, tmp = server
        payload = json.dumps({"notes": "Looks good", "status": "approved"}).encode()
        req = urllib.request.Request(
            f"{base_url}/feedback/test-form",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = urllib.request.urlopen(req)
        assert resp.status == 200
        result = json.loads(resp.read())
        assert result == {"ok": True}

        # Now GET it back
        resp2 = urllib.request.urlopen(f"{base_url}/feedback/test-form")
        data = json.loads(resp2.read())
        assert data["notes"] == "Looks good"
        assert data["status"] == "approved"

    def test_post_merges_existing_feedback(self, server):
        base_url, _ = server
        form_id = "merge-test-form"

        def post(payload: dict):
            body = json.dumps(payload).encode()
            req = urllib.request.Request(
                f"{base_url}/feedback/{form_id}",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req)

        post({"status": "approved", "notes": "First note"})
        post({"reviewer": "alice"})  # second POST adds a key

        resp = urllib.request.urlopen(f"{base_url}/feedback/{form_id}")
        data = json.loads(resp.read())
        assert data["status"] == "approved"
        assert data["notes"] == "First note"
        assert data["reviewer"] == "alice"

    def test_post_merges_control_notes(self, server):
        base_url, _ = server
        form_id = "control-notes-form"

        def post(payload: dict):
            body = json.dumps(payload).encode()
            req = urllib.request.Request(
                f"{base_url}/feedback/{form_id}",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req)

        post({"control_notes": {"4_2_1": {"severity": "warning", "note": "Check this"}}})
        post({"control_notes": {"4_2_2": {"severity": "info", "note": "Looks fine"}}})

        resp = urllib.request.urlopen(f"{base_url}/feedback/{form_id}")
        data = json.loads(resp.read())
        assert "4_2_1" in data["control_notes"]
        assert "4_2_2" in data["control_notes"]

    def test_feedback_written_to_correct_directory(self, server):
        """Feedback files must not be written into pipeline/runs/."""
        base_url, tmp = server
        payload = json.dumps({"notes": "dir check"}).encode()
        req = urllib.request.Request(
            f"{base_url}/feedback/dir-check-form",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req)

        written = tmp / "dir-check-form.json"
        assert written.exists(), f"Expected {written} to exist"
        # Must NOT appear in pipeline/runs/
        runs_path = PIPELINE_DIR / "runs" / "1" / "feedback" / "dir-check-form.json"
        assert not runs_path.exists(), f"File was incorrectly written to {runs_path}"
