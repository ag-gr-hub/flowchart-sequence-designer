# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Active support  |
| < 1.0   | ❌ Not supported   |

## Reporting a Vulnerability

If you discover a security vulnerability in `flowchart-sequence-designer`,
please report it responsibly:

1. **Do NOT open a public GitHub issue.**
2. Email **[security contact via GitHub private vulnerability reporting]** or
   use GitHub's [private vulnerability reporting](https://github.com/ag-gr-hub/flowchart-sequence-designer/security/advisories/new) feature.
3. Include:
   - A description of the vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)

We aim to acknowledge reports within **48 hours** and provide a fix or
mitigation within **7 days** for confirmed issues.

## Scope

This package runs entirely in the browser (no server component). The primary
attack surface is:

- **Import parsers** (JSON, Mermaid, PlantUML) — untrusted input is parsed
  and rendered on the user's canvas.
- **SVG/PNG export** — user-authored content is serialized; XSS in exported
  SVG is mitigated via XML escaping.
- **Dependencies** — we keep dependencies minimal and pin versions.

## Security Practices

- All GitHub Actions are SHA-pinned (not floating tags)
- CI workflows use minimal `permissions`
- No `eval()`, `innerHTML`, or `dangerouslySetInnerHTML` in source
- JSON importer validates schema before hydration
- SVG exporter escapes all user-provided text via `escapeXML()`
