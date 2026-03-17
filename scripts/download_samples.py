"""Download sample street-level images for demo purposes."""
import os
import requests

SAVE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_images")
os.makedirs(SAVE_DIR, exist_ok=True)

# Curated Unsplash photo IDs of urban street scenes (Creative Commons)
# Using Unsplash source URLs which redirect to actual images
SEEDS = [
    "city-street-1", "urban-road-2", "downtown-3", "avenue-4", "sidewalk-5",
    "intersection-6", "boulevard-7", "alley-8", "highway-9", "suburb-10",
    "crosswalk-11", "bridge-12", "park-road-13", "residential-14", "plaza-15",
]

def download():
    for i, seed in enumerate(SEEDS, 1):
        fname = f"img_{i:03d}.jpg"
        path = os.path.join(SAVE_DIR, fname)
        if os.path.exists(path):
            print(f"  {fname} already exists, skipping")
            continue
        # picsum.photos gives high-quality CC0 images, deterministic by seed
        url = f"https://picsum.photos/seed/{seed}/2048/1024"
        print(f"  Downloading {fname} from seed '{seed}'...", end=" ", flush=True)
        try:
            resp = requests.get(url, timeout=30, allow_redirects=True)
            resp.raise_for_status()
            with open(path, "wb") as f:
                f.write(resp.content)
            print(f"OK ({len(resp.content) // 1024}KB)")
        except Exception as e:
            print(f"FAILED: {e}")

if __name__ == "__main__":
    print("Downloading sample street images...")
    download()
    count = len([f for f in os.listdir(SAVE_DIR) if f.endswith(".jpg")])
    print(f"Done. {count} images in {SAVE_DIR}")
