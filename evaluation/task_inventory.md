# Task Inventory

Seven analytical tasks newly enabled by the Street-Level Vision Analytics Node. Each task describes a real urban analysis scenario, how it was previously accomplished (if at all), and how the node transforms the workflow.

---

## Task 1: Compare Greenery Across Neighborhoods

**Description:** Measure and compare vegetation coverage (trees, grass, shrubs) across multiple Chicago neighborhoods to identify green space inequities at the block level.

**Target User Role:** Urban planner, environmental equity researcher

**How It Was Done Before (Manual):**
Analysts manually reviewed satellite imagery or conducted physical audits. Street-level vegetation was estimated by hand from Google Street View, one location at a time, with results recorded in spreadsheets. Comparing neighborhoods required weeks of fieldwork and subjective visual estimation.

**How the Node Enables It:**
1. Load the `cityscapes_19.csv` class definitions and select `vegetation`, `terrain`, `sky` as target classes
2. Configure SegFormer (`nvidia/segformer-b2-finetuned-cityscapes-1024-1024`) as the model
3. Run analysis on Lincoln Park, Hyde Park, and The Loop bounding boxes sequentially
4. Compare per-block vegetation ratios across neighborhoods using the exported GeoJSON in Curio's map node
5. Identify specific blocks with below-average greenery coverage

**Estimated Time Savings:** From 2-3 weeks of manual auditing to under 1 hour of automated analysis per neighborhood.

---

## Task 2: Identify Blocks with Zero Street Furniture

**Description:** Find city blocks that completely lack public amenities like benches, trash cans, and bike racks — indicators of underinvestment in pedestrian infrastructure.

**Target User Role:** City infrastructure planner, accessibility advocate

**How It Was Done Before (Manual):**
Field teams walked neighborhoods and manually cataloged street furniture using clipboards or mobile survey apps. Coverage was patchy, expensive to scale, and difficult to keep current as furniture was added or removed.

**How the Node Enables It:**
1. Load `street_furniture.csv` class definitions
2. Configure YOLOv8 for object detection
3. Run detection on Mapillary imagery across the target area
4. Use the spatial aggregation service to join detections to block-level grid cells
5. Filter GeoJSON output for blocks where all furniture counts equal zero
6. Visualize gaps on Curio's map node to prioritize installation

**Estimated Time Savings:** From 1-2 weeks of walking surveys per neighborhood to 30 minutes of automated detection and filtering.

---

## Task 3: Verify CV Classification Against Source Image

**Description:** Manually inspect individual CV predictions to assess model reliability — comparing the segmentation overlay or detection bounding boxes against the original street-level photograph.

**Target User Role:** Data quality analyst, CV model evaluator

**How It Was Done Before (Manual):**
Required custom Python scripts to load model outputs alongside source images. Analysts needed programming skills to render overlays, compute metrics, and flag errors. No integrated workflow existed for non-technical reviewers.

**How the Node Enables It:**
1. Run any inference job (segmentation or detection)
2. Click any result card in the Gallery to open the Image Inspector
3. Toggle between Source Photo, CV Overlay, and Side-by-Side tabs
4. Review the Class Breakdown bar chart for quantitative verification
5. Click "Flag as Incorrect" to exclude misclassified images from aggregation
6. Re-examine flagged images after adjusting model or class configuration

**Estimated Time Savings:** From hours of scripting and manual rendering to instant, interactive inspection with zero code.

---

## Task 4: Find Areas with Poor Sidewalk Coverage

**Description:** Identify streets and blocks where sidewalk area is disproportionately low compared to road area — a walkability indicator for pedestrian safety assessments.

**Target User Role:** Transportation planner, pedestrian safety advocate

**How It Was Done Before (Manual):**
Analysts used GIS data for sidewalk presence (often outdated or incomplete) or manually measured from aerial imagery. Street-level perspective — which reveals actual sidewalk width, obstructions, and condition — was rarely captured at scale.

**How the Node Enables It:**
1. Configure SegFormer with Cityscapes classes: `sidewalk`, `road`, `building`
2. Run segmentation on Mapillary imagery for the target area
3. Compute the `sidewalk / (sidewalk + road)` ratio from class_ratios in each result
4. Use compound filtering in the Gallery (e.g., `sidewalk < 0.10`) to find problem areas
5. Export filtered results as GeoJSON and overlay on Curio's map with census tract boundaries

**Estimated Time Savings:** From multi-day GIS analysis with incomplete data to 1-2 hours of automated street-level assessment.

---

## Task 5: Audit Accessibility Ramp Presence

**Description:** Survey intersections and curb cuts for the presence of accessibility ramps, identifying locations that may not comply with ADA requirements.

**Target User Role:** Accessibility compliance officer, disability rights advocate

**How It Was Done Before (Manual):**
Physical inspections by field teams, often covering only a fraction of intersections in a given area. Results were recorded on paper forms or proprietary survey tools, with no easy way to visualize spatial patterns or share findings across departments.

**How the Node Enables It:**
1. Configure YOLOv8 with a detection class for `ramp` (from `street_furniture.csv`)
2. Run detection on Mapillary imagery covering the target neighborhood
3. Aggregate ramp detections to block-level grid cells via spatial join
4. Identify blocks with zero ramp detections as candidates for physical inspection
5. Export the GeoJSON and overlay with known intersection locations in Curio

**Estimated Time Savings:** From weeks of physical intersection surveys to a prioritized shortlist generated in under 1 hour.

---

## Task 6: Track Seasonal Vegetation Changes

**Description:** Compare vegetation coverage in the same neighborhood across different seasons (e.g., summer vs. winter imagery) to understand how green infrastructure varies over time.

**Target User Role:** Environmental researcher, urban forestry manager

**How It Was Done Before (Manual):**
Required multi-temporal satellite imagery analysis (NDVI differencing) or repeated field visits. Street-level seasonal comparison was essentially infeasible at scale — no tools existed to run the same CV analysis on time-filtered street imagery and compare results.

**How the Node Enables It:**
1. Configure SegFormer with vegetation-focused classes from `vegetation.csv`
2. Run analysis on the same bounding box with Mapillary's `start_date`/`end_date` filters for summer (Jun-Aug) and winter (Dec-Feb)
3. Compare per-block vegetation ratios between the two runs
4. Visualize seasonal difference maps in Curio by joining both GeoJSON outputs to the same grid
5. Identify blocks where vegetation drops most dramatically in winter (deciduous canopy vs. evergreen)

**Estimated Time Savings:** From multi-season field campaigns spanning months to two analysis runs (one per season) completed in under 2 hours total.

---

## Task 7: Correlate Street-Level Attributes with Census Data

**Description:** Join street-level CV metrics (vegetation coverage, furniture density, sidewalk ratios) with demographic data from the U.S. Census to investigate correlations between physical environment quality and socioeconomic indicators.

**Target User Role:** Urban researcher, policy analyst, equity advocate

**How It Was Done Before (Manual):**
Required separate GIS workflows to (a) manually assess street-level conditions, (b) download and clean census data, (c) align geographic boundaries, and (d) compute correlations. Each step involved different tools and expertise, making the end-to-end analysis accessible only to advanced GIS analysts.

**How the Node Enables It:**
1. Run segmentation or detection across multiple neighborhoods (Lincoln Park, Hyde Park, The Loop)
2. Export results as GeoJSON FeatureCollections
3. In Curio, connect the Street Vision node's GeoJSON output to a spatial join node with census tract boundaries
4. Use Curio's chart node to plot vegetation ratio vs. median household income, or furniture count vs. population density
5. Identify statistically significant correlations that may indicate environmental inequity

**Estimated Time Savings:** From a multi-week, multi-tool GIS project to a single Curio dataflow pipeline assembled in 2-3 hours.

---

## Summary

| # | Task | Model | Key Metric | Time Savings |
|---|------|-------|------------|-------------|
| 1 | Compare greenery across neighborhoods | SegFormer | Vegetation pixel ratio | 2-3 weeks → 1 hour |
| 2 | Identify blocks with zero street furniture | YOLOv8 | Furniture object count | 1-2 weeks → 30 min |
| 3 | Verify CV classification against source | Any | Visual inspection | Hours of scripting → instant |
| 4 | Find areas with poor sidewalk coverage | SegFormer | Sidewalk/road ratio | Multi-day → 1-2 hours |
| 5 | Audit accessibility ramp presence | YOLOv8 | Ramp detection count | Weeks → 1 hour |
| 6 | Track seasonal vegetation changes | SegFormer | Seasonal vegetation diff | Months → 2 hours |
| 7 | Correlate street attributes with census | Any | Cross-dataset correlation | Multi-week → 2-3 hours |
