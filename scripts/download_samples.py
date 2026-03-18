"""Download real street-level images for demo purposes.

These are curated Unsplash photos that look like dashcam / street-view
imagery: roads with lane markings, sidewalks, buildings lining streets,
parked cars, trees along roads, intersections, crosswalks — the kind
of scene a Mapillary or Google Street View camera would capture.
"""
import os
import requests

SAVE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_images")
os.makedirs(SAVE_DIR, exist_ok=True)

# Every image here is a ground-level street photograph showing road + surroundings
IMAGES = [
    # Straight road views with buildings on sides
    ("img_001.jpg", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=2048&q=80"),  # city road with lane markings and buildings
    ("img_002.jpg", "https://images.unsplash.com/photo-1573152143286-0c422b4d2175?w=2048&q=80"),  # residential street with parked cars
    ("img_003.jpg", "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=2048&q=80"),  # suburban street with houses
    ("img_004.jpg", "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=2048&q=80"),  # city street with traffic
    ("img_005.jpg", "https://images.unsplash.com/photo-1517420879524-86d64ac2f339?w=2048&q=80"),  # downtown road lined with buildings

    # Intersections and crosswalks
    ("img_006.jpg", "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=2048&q=80"),  # urban intersection with pedestrians
    ("img_007.jpg", "https://images.unsplash.com/photo-1542332213-31f87348057f?w=2048&q=80"),  # crosswalk at city intersection

    # Tree-lined streets (greenery + road + buildings)
    ("img_008.jpg", "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=2048&q=80"),  # tree-lined boulevard
    ("img_009.jpg", "https://images.unsplash.com/photo-1501446529957-6226bd447c46?w=2048&q=80"),  # road through tree canopy

    # Urban roads with vehicles and infrastructure
    ("img_010.jpg", "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=2048&q=80"),  # highway with vehicles
    ("img_011.jpg", "https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?w=2048&q=80"),  # long road perspective with sky
    ("img_012.jpg", "https://images.unsplash.com/photo-1524813686514-a57563d77965?w=2048&q=80"),  # European city street with buildings

    # Sidewalk-level views
    ("img_013.jpg", "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=2048&q=80"),  # sidewalk along shops and buildings
    ("img_014.jpg", "https://images.unsplash.com/photo-1476990789491-712b869b3098?w=2048&q=80"),  # urban alley with buildings both sides
    ("img_015.jpg", "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?w=2048&q=80"),  # road vanishing point with trees and sky
]


def download():
    headers = {"User-Agent": "StreetVisionNode/1.0 (academic research)"}
    for fname, url in IMAGES:
        path = os.path.join(SAVE_DIR, fname)
        if os.path.exists(path) and os.path.getsize(path) > 10000:
            print(f"  {fname} already exists, skipping")
            continue
        print(f"  Downloading {fname}...", end=" ", flush=True)
        try:
            resp = requests.get(url, timeout=30, headers=headers, allow_redirects=True)
            resp.raise_for_status()
            with open(path, "wb") as f:
                f.write(resp.content)
            print(f"OK ({len(resp.content) // 1024}KB)")
        except Exception as e:
            print(f"FAILED: {e}")


if __name__ == "__main__":
    print("Downloading street-level sample images...")
    download()
    count = len([f for f in os.listdir(SAVE_DIR) if f.endswith(".jpg")])
    print(f"Done. {count} images in {SAVE_DIR}")
