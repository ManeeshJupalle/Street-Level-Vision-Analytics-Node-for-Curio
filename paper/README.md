# M3 Paper — Build & Submission Notes

This directory contains the 4-page IEEE VGTC paper for **CS 524, Group 13**.

## Files

- `main.tex` — the paper (uses `\documentclass[journal]{vgtc}`)
- `template.bib` — bibliography (~20 entries)
- `figures/` — image assets referenced by `\includegraphics{...}`

## How to compile

The paper uses the IEEE VGTC LaTeX class. The class file (`vgtc.cls`) and the BibTeX styles
(`abbrv-doi-hyperref.bst` and friends) are **not** in this directory — drop the official template
contents into this folder, or compile inside Overleaf using the IEEE VGTC template.

### Overleaf (recommended)

1. Create a new Overleaf project from the **IEEE VGTC** template.
2. Replace its `main.tex` with this directory's `main.tex`.
3. Replace its `template.bib` with this directory's `template.bib`.
4. Upload everything in `figures/` into the project's `figures/` folder.
5. Recompile (pdfLaTeX). Bibliography style is `abbrv-doi-hyperref`.

### Local

```bash
pdflatex main
bibtex   main
pdflatex main
pdflatex main
```

You will need `vgtc.cls`, `abbrv-doi-hyperref.bst`, plus the standard CTAN packages
(`hyperref`, `cleveref`, `tabu`, `booktabs`, `ccicons`, `mathptmx`, `subcaption`).

## Figures the paper references (TODO before submission)

The `.tex` references three image filenames. Drop matching files into `figures/`:

| Filename                       | What it should show                                                                                                  | Suggested source                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `teaser_curio_canvas.{png,pdf}`| The Curio canvas with Street Vision → CV Analysis → Vega-Lite Map View + Vega-Lite Neighborhood Summary + Table, all populated. | Screenshot from `localhost:3000` (the Curio frontend).          |
| `architecture.{png,pdf}`       | The system architecture diagram (External APIs → Street Vision Node → CV Analysis Node → User-facing output blocks). | Cropped slide / hand-authored diagram (vector PDF preferred over PNG). |
| `config_wizard.{png,pdf}`      | The Street Vision node's three-step configuration wizard expanded, with model search results, place name input, and class chips visible.| Screenshot from inside the Street Vision node on the Curio canvas (`localhost:3000`).|
| `gallery_inspector.{png,pdf}`  | The CV Analysis Image Inspector open, showing source photo + Mask2Former overlay + class-breakdown bar.| Screenshot from inside the CV Analysis node on the Curio canvas (`localhost:3000`).|

Vector formats (PDF/SVG-rendered-to-PDF) reproduce best — only fall back to PNG for screenshots.
Add `alt=` text to each `\includegraphics` call (already present in the template).

## Bibliography — verify before submission

Every `.bib` entry was hand-written from a known publication, but the following need a quick check
against the publisher record:

- `Xie2021SegFormerSimpleEfficient` — confirm whether you cite the NeurIPS 2021 proceedings or the arXiv version (2105.15203). NeurIPS papers usually have no DOI; arXiv preferred.
- `Jocher2023YOLOv8` — there is no peer-reviewed publication; `@misc` with the GitHub URL is the convention used in CV papers.
- All other DOIs were verified at write time but please double-check on IEEE Xplore / ACM DL / Crossref before final submission.

## Length check

The paper is structured to fit in **4 pages** in two-column VGTC format (excluding the references list).
After your first compile, if the references push past page 4, consider:

1. Tightening the Related Work section (cut `Sakaridis2018` first — it's the least essential).
2. Moving Table 1 or Figure 3 into supplemental material.
3. Switching the bibliography style to `abbrv-doi-hyperref-narrow` to save space on DOIs.

## Known content gaps the team should fill in

- **Author affiliations** — currently both authors listed as UIC; update emails if needed.
- **Acknowledgments** — generic wording; consider thanking the specific TA / Curio authors by name.
- **Future user study** — the conclusion mentions a planned user study; if you have any pilot data
  (even from teammates testing the UI), mention specifics rather than the generic claim.
- **ORCID IDs** — author block uses plain `\author{...}` without ORCIDs; add via `\authororcid{}`
  if either author has registered IDs.

## Honest framing of the 20-image cap

The Evaluation section explicitly notes the demo-mode cap and reports per-image latency rather than
a fake scaling curve. This is the safest way to handle the existing `evaluation/performance_benchmarks/results.json`
file: do not claim scaling that the data does not show. If you re-run the benchmark with the cap
removed before submission, update both the JSON and the paragraph in §5 of `main.tex`.
