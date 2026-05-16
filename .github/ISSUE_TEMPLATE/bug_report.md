---
name: Bug report
about: Report something that isn't working as documented
title: '[Bug] '
labels: bug
---

## What happened

<!-- A clear description of the bug. -->

## Expected behavior

<!-- What you thought would happen. -->

## Minimal reproduction

<!-- A runnable snippet, CodeSandbox link, or test case. The smaller the better. -->

```ts
// e.g.
import { flowchart } from 'flowchart-sequence-designer';
const m = flowchart('test').node('a', 'A').node('b', 'B').edge('a', 'b');
console.log(m.toMermaid()); // → unexpected output
```

## Environment

- Package version: `0.1.0`
- Runtime: Bun / Node / browser (which?)
- OS:
- Browser (if UI-related):

## Additional context

<!-- Screenshots, related issues, anything else useful. -->
