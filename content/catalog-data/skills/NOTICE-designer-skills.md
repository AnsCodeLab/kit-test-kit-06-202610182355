# Notice

The following catalog skills are vendored, with minor adaptation noted below, from
[Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills), MIT licensed:

design-brief, visual-hierarchy, state-machine, loading-states, form-design, feedback-patterns,
design-token, component-spec, design-system-governance, motion-system, color-system, typography-scale,
spacing-system, layout-grid, critique-visual-hierarchy, critique-affordance, critique-color,
critique-composition, critique-typography, critique-brand-consistency, critique-information-density.

`visual-critique-screen` is adapted from that repo's `/critique-screen` command: steps 4 and 5
(deduplication by root cause, and a real severity/blast-radius model) were added after real
testing in this project found the upstream ranking step lacked both, verified against a fixture
with deliberately planted UX defects (see `docs/superpowers/specs/2026-09-26-enclave-agent-kit-design.md`
change history for the test evidence).

Original license, reproduced in full per its terms:

```
MIT License

Copyright (c) 2026 MC Dean

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
