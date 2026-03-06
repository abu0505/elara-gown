import os
import sys
from PIL import Image

def split_image_2x2(image_path, prefix):
    img = Image.open(image_path)
    width, height = img.size
    
    w_mid = width // 2
    h_mid = height // 2
    
    box1 = (0, 0, w_mid, h_mid)
    box2 = (w_mid, 0, width, h_mid)
    box3 = (0, h_mid, w_mid, height)
    box4 = (w_mid, h_mid, width, height)
    
    output_dir = os.path.join(os.getcwd(), "public", "media")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    img.crop(box1).save(os.path.join(output_dir, f"{prefix}_1_front.png"))
    img.crop(box2).save(os.path.join(output_dir, f"{prefix}_2_back.png"))
    img.crop(box3).save(os.path.join(output_dir, f"{prefix}_3_zoom.png"))
    img.crop(box4).save(os.path.join(output_dir, f"{prefix}_4_spot.png"))
    
    print(f"Successfully split {image_path} and saved to public/media")

def split_all_in_dir(directory):
    for filename in os.listdir(directory):
        if "_grid_" in filename and filename.endswith(".png"):
            # Extract category name from filename
            # e.g. evening_gown_grid_123.png -> evening_gown
            prefix = filename.split("_grid_")[0]
            # Handle multiple of same category if needed, adding a simple counter or just using the unique prefix
            path = os.path.join(directory, filename)
            split_image_2x2(path, prefix)

if __name__ == "__main__":
    media_dir = os.path.join(os.getcwd(), "public", "media")
    split_all_in_dir(media_dir)
