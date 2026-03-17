# Task Inventory

## Planned Evaluation Tasks

### 1. Chicago Greenery Analysis
- **Goal**: Measure vegetation coverage across Lincoln Park area
- **Model**: Semantic segmentation (Cityscapes-trained)
- **Data**: Mapillary street-level images in bbox
- **Metric**: Vegetation pixel ratio per image, aggregated to grid cells

### 2. Vehicle Counting
- **Goal**: Count and classify vehicles in street scenes
- **Model**: YOLOv8 object detection
- **Data**: Mapillary or local image folder
- **Metric**: Object counts per class per image
