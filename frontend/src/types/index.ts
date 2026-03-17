export type ModelType = 'segmentation' | 'detection' | 'classification';
export type DataSourceType = 'folder' | 'mapillary' | 'url';

export interface ModelSearchResult {
  model_id: string;
  name: string;
  downloads: number;
  likes?: number;
  task: string;
}

export interface ModelInfo {
  model_id: string;
  model_type: ModelType;
  name: string;
  description: string;
}

export interface DataSourceConfig {
  source_type: DataSourceType;
  folder_path?: string;
  api_endpoint?: string;
  bbox?: number[];
  limit: number;
}

export interface ClassConfig {
  classes: string[];
  source: string;
}

export interface InferenceRequest {
  model: ModelInfo;
  data_source: DataSourceConfig;
  classes: ClassConfig;
}

export interface SegmentationResult {
  image_id: string;
  image_url: string;
  latitude?: number;
  longitude?: number;
  class_ratios: Record<string, number>;
  demo_mode?: boolean;
}

export interface DetectionResult {
  image_id: string;
  image_url: string;
  latitude?: number;
  longitude?: number;
  detections: Detection[];
  object_counts: Record<string, number>;
  demo_mode?: boolean;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
}

export interface InferenceResponse {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  total_images: number;
  processed: number;
  results: ResultItem[];
}

export type ResultItem = SegmentationResult | DetectionResult;

export interface FilterRule {
  id: string;
  attribute: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
}

export interface MapillaryImage {
  id: string;
  latitude: number;
  longitude: number;
  captured_at: string;
  compass_angle?: number;
  thumb_2048_url?: string;
}
