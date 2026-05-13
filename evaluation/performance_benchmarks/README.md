# Performance Benchmarks

Per-image inference latency measurements for the Street Vision pipeline.

## Files

- [`benchmark.py`](benchmark.py) — the harness (pre-existing).
- [`results.json`](results.json) — measurement output, honestly framed.
- ~~`latency_chart.png`~~ — removed. The chart's x-axis labelled the bars as "10 / 50 / 100 / 500 images" but three of those bars were actually 20-image runs (cap-clamped). Keeping it would have been actively misleading; re-running with the cap lifted is a future task.

## What the data shows

A single, defensible number: **~0.30 s per image** for SegFormer-B2 at 1024×1024 on a 4-core CPU, equivalent to ~3.32 images/s end-to-end (including HTTP and post-processing). The standard deviation across four independent runs is below 0.0001 s, so the measurement is stable.

## What the data does NOT show

A scaling curve. The benchmark script attempts four batch sizes (10, 50, 100, 500) but the demo-mode batch cap in `backend/config.py` clamps any request above 20 down to 20 images. As a result, three of the four runs collapsed to the same effective batch size, and the four data points cannot be plotted as a meaningful "throughput vs batch size" curve. They are four near-identical samples of the same underlying measurement.

## Known issues

- **No real scaling study is possible without a source change.** Lifting the cap is a one-line edit in `backend/config.py`. That edit is intentionally out of scope for the M3 deliverable per project policy; if a future revision relaxes the policy, re-running `python -m evaluation.performance_benchmarks.benchmark` after the edit will produce a real curve, and the chart can be regenerated then.

## How the paper uses this data

§5 of the IEEE VGTC paper (`paper/main.tex`, "Performance" paragraph) reports the per-image latency and explicitly notes the cap and why no scaling claim is made. The paragraph and this JSON file are intentionally consistent.
