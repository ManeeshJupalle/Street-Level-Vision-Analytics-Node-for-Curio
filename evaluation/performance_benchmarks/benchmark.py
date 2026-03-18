"""
Performance benchmark for the Street-Level Vision Analytics pipeline.

Measures pipeline latency at different image counts using demo mode inference.
Outputs results to results.json and generates a latency chart.

Usage:
    python -m evaluation.performance_benchmarks.benchmark
"""

import asyncio
import json
import os
import time
from pathlib import Path

from backend.models.schemas import (
    ClassConfig,
    DataSourceConfig,
    DataSourceType,
    InferenceRequest,
    ModelInfo,
    ModelType,
)
from backend.services.inference_service import run_batch_inference

OUTPUT_DIR = Path(__file__).parent
IMAGE_COUNTS = [10, 50, 100, 500]


def make_request(limit: int, model_type: ModelType = ModelType.segmentation) -> InferenceRequest:
    return InferenceRequest(
        model=ModelInfo(
            model_id="benchmark/demo-model",
            model_type=model_type,
            name="Benchmark Model",
        ),
        data_source=DataSourceConfig(
            source_type=DataSourceType.mapillary,
            bbox=[-87.66, 41.91, -87.62, 41.94],
            limit=limit,
        ),
        classes=ClassConfig(
            classes=["vegetation", "road", "building", "sidewalk", "sky"],
            source="prompt",
        ),
    )


async def benchmark_inference(limit: int) -> dict:
    """Run inference and measure timing."""
    request = make_request(limit)

    start = time.perf_counter()
    results = []
    per_image_times = []

    async for result in run_batch_inference(request):
        img_time = time.perf_counter()
        results.append(result)
        per_image_times.append(img_time)

    end = time.perf_counter()
    total_time = end - start
    num_results = len(results)

    avg_per_image = total_time / num_results if num_results > 0 else 0

    return {
        "image_count_requested": limit,
        "image_count_processed": num_results,
        "total_pipeline_time_sec": round(total_time, 3),
        "avg_inference_time_per_image_sec": round(avg_per_image, 4),
        "throughput_images_per_sec": round(num_results / total_time, 2) if total_time > 0 else 0,
    }


async def run_all_benchmarks() -> list:
    """Run benchmarks for all image counts."""
    results = []
    for count in IMAGE_COUNTS:
        print(f"  Benchmarking {count} images...")
        result = await benchmark_inference(count)
        results.append(result)
        print(f"    -> {result['image_count_processed']} images in {result['total_pipeline_time_sec']}s")
    return results


def save_results(results: list):
    """Save benchmark results to JSON."""
    output_path = OUTPUT_DIR / "results.json"
    output = {
        "benchmark": "Street Vision Pipeline Latency",
        "description": "Measures demo mode inference latency at different image counts",
        "image_counts_tested": IMAGE_COUNTS,
        "results": results,
    }
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {output_path}")


def generate_chart(results: list):
    """Generate a latency chart using matplotlib."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed — skipping chart generation")
        print("Install with: pip install matplotlib")
        return

    counts = [r["image_count_processed"] for r in results]
    total_times = [r["total_pipeline_time_sec"] for r in results]
    avg_times = [r["avg_inference_time_per_image_sec"] for r in results]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    # Total pipeline time
    ax1.plot(counts, total_times, "o-", color="#3b82f6", linewidth=2, markersize=8)
    ax1.set_xlabel("Number of Images", fontsize=12)
    ax1.set_ylabel("Total Time (seconds)", fontsize=12)
    ax1.set_title("Total Pipeline Latency", fontsize=14)
    ax1.grid(True, alpha=0.3)

    # Average time per image
    ax2.bar(
        [str(c) for c in counts],
        avg_times,
        color="#2ecc71",
        edgecolor="#27ae60",
        linewidth=1.5,
    )
    ax2.set_xlabel("Number of Images", fontsize=12)
    ax2.set_ylabel("Avg Time per Image (seconds)", fontsize=12)
    ax2.set_title("Per-Image Inference Latency", fontsize=14)
    ax2.grid(True, alpha=0.3, axis="y")

    fig.suptitle("Street Vision Pipeline — Performance Benchmarks", fontsize=16, y=1.02)
    fig.tight_layout()

    chart_path = OUTPUT_DIR / "latency_chart.png"
    fig.savefig(chart_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Chart saved to {chart_path}")


async def main():
    print("Street Vision Pipeline — Performance Benchmark")
    print("=" * 50)
    print(f"Image counts: {IMAGE_COUNTS}")
    print()

    results = await run_all_benchmarks()
    save_results(results)
    generate_chart(results)

    print("\nSummary:")
    print(f"{'Images':>8} | {'Total (s)':>10} | {'Per Image (s)':>14} | {'Throughput':>12}")
    print("-" * 55)
    for r in results:
        print(
            f"{r['image_count_processed']:>8} | "
            f"{r['total_pipeline_time_sec']:>10.3f} | "
            f"{r['avg_inference_time_per_image_sec']:>14.4f} | "
            f"{r['throughput_images_per_sec']:>10.2f}/s"
        )


if __name__ == "__main__":
    asyncio.run(main())
