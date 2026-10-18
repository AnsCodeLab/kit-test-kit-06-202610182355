# OWASP Coverage Checklist — Details

**Load this when:** running the Coverage Checklist sweep in SKILL.md and you need the concrete "what counts" for a category, not just its name.

For each category: check the code against it explicitly, even when nothing "looks" wrong — the point of a checklist is catching what a first-glance skim misses.

## 1. Broken Access Control

Two separate failures, both count, check both:

- **Missing authentication** — an endpoint/handler with no session/token check at all, while sibling endpoints in the same file have one. Compare against the file's own established pattern.
- **Missing authorization / IDOR (Insecure Direct Object Reference)** — authentication exists, but the handler never checks that the *authenticated* caller owns or is entitled to *this specific* resource (`WHERE id = ?` with no `AND user_id = ?`, or an ID taken from the URL and never cross-checked against the session). This is the subtler, more commonly missed half — an `@require_auth` decorator being present proves nothing about object-level scoping.

## 2. Injection

Any place user-controlled input reaches an interpreter as *code* rather than *data*:

- SQL built via string concatenation/formatting (`%`, `.format()`, f-strings) instead of parameterized placeholders — even when only one field in a function is unsafe while sibling functions correctly use `?`/`%s` placeholders.
- Shell/OS command construction via string interpolation (`subprocess` with `shell=True` and interpolated input, `os.system`).
- Template injection (user input rendered as a template string rather than a template variable).
- LDAP/XPath query construction via interpolation.

## 3. Insecure Deserialization

Untrusted bytes/text turned into live objects or executed:

- `yaml.load(x)` or `yaml.load(x, Loader=yaml.Loader)` on anything not fully trusted — `yaml.Loader` can construct arbitrary Python objects via tags like `!!python/object/apply`. Must be `yaml.safe_load` or `Loader=yaml.SafeLoader`.
- `pickle.loads` / `pickle.load` on request bodies, cache values, or any externally-influenced bytes.
- `eval`/`exec` on user input, including "just a config expression."
- Deserializing without a schema/type allowlist where the format supports polymorphic object construction (e.g. Java `ObjectInputStream`, PHP `unserialize`).

## 4. Secrets Beyond Literal-String Detection

The `secret-scan` gitleaks hook catches high-entropy literal strings. This checklist item covers what it structurally can't:

- Insecure defaults that look like placeholders but ship as-is: `SECRET_KEY = "dev"`, `DEBUG = True` in what's actually the production config path.
- Hardcoded fallback credentials in an `or` / default-argument chain: `password = os.environ.get("DB_PASS") or "changeme"`.
- Real credentials embedded in structured config (docker-compose, CI YAML, `.env.example` accidentally containing a working value instead of a placeholder).
- Secrets logged, echoed in error messages, or returned in an API response body.

## 5. Dependency CVEs

- Any new dependency, or an existing dependency's version bump, in a lockfile/manifest (`requirements.txt`, `package.json`/`package-lock.json`, `go.mod`, `Gemfile.lock`, etc.) touched by the diff.
- Check the specific pinned version against known advisories (search the CVE/GHSA database for `<package> <version>`) rather than assuming a bump is always an improvement — a bump can *introduce* a CVE just as easily as an old pin can carry one forward.
- Flag unpinned/floating version ranges (`*`, `>=`) introduced where the rest of the manifest pins exact versions — that's a supply-chain risk even without a currently-known CVE.

## 6. Other OWASP Top 10-Shaped Issues

Not a mandatory sweep item on every audit, but flag it at the severity it deserves when visibly present in the reviewed scope:

- **SSRF** — server-side code fetching a URL built from user input with no allowlist.
- **XXE** — XML parsing with external entity resolution enabled on untrusted input.
- **Mass assignment** — a handler that blindly applies an entire request body to a model/row instead of an explicit allowed-fields list.
- **Insecure crypto** — MD5/SHA1 for password hashing, ECB mode, hardcoded IVs/salts, home-rolled crypto.
