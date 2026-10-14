---
title: Manifest schema
description: The runner-agnostic run manifest that pixsame tools read and write. The specification lives on visual-regression.dev.
order: 2
---

# Manifest schema

The manifest is a machine-readable record of every screenshot comparison made during a test run. A visual regression tool writes it, and CI tooling such as PR comment bots, review dashboards and approval tools reads it. It is the contract between a test runner and everything downstream.

It is an open, runner-agnostic format that is not tied to pixsame. The specification, the field reference, the converters for other runners and the viewer are maintained at [visual-regression.dev/manifest](https://visual-regression.dev/manifest), in the open-source [visual-regression](https://github.com/visual-regression/visual-regression) repository. The JSON Schema, types, reader, writer and merger ship as [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) on npm.

Every pixsame tool reads and writes this format, and the GitHub App and the hosted platform accept a manifest from any runner.
