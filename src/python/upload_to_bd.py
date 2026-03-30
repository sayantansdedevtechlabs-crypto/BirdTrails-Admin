import os
import pandas as pd
from supabase import create_client, Client

# --- 1. CONFIGURATION ---
SUPABASE_URL = "https://qdnmqhcbciwmegjsfifw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbm1xaGNiY2l3bWVnanNmaWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgzNTIzMSwiZXhwIjoyMDc5NDExMjMxfQ.A7tRT82MnNQuyFiKVnGpR1CSM2HfRct0yf3gaYqcz6Y" # <-- USE SERVICE ROLE KEY

# WE ARE NOW USING YOUR EXACT UPLOADED FILE
CSV_FILE = "/Users/sayantan_banerjee/Documents/EKW-Bird_Trail_App/BOTH/bird-trail-admin/birdtrails-admin-react/src/python/Content For Bird App.csv" 
IMAGE_FOLDER = "/Users/sayantan_banerjee/Documents/EKW-Bird_Trail_App/BOTH/bird-trail-admin/birdtrails-admin-react/src/python/birdAssets_thumb"
BUCKET_NAME = "bird_images"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_image_path(common_name):
    # Converts 'Asian Brown Flycatcher' to 'asian_brown_flycatcher'
    clean_name = str(common_name).strip().lower().replace(" ", "_").replace("-", "_")
    for ext in ['.jpg', '.jpeg', '.png']:
        path = os.path.join(IMAGE_FOLDER, f"{clean_name}{ext}")
        if os.path.exists(path):
            return path, f"{clean_name}{ext}"
    return None, None

def clean_status(raw_status):
    """
    Ensures the status strictly matches your Supabase CHECK constraint.
    Allowed: 'Resident', 'Migratory', 'Winter', 'Passage', 'Vagrant'
    """
    status_str = str(raw_status).strip().title()
    
    if 'Resident' in status_str: return 'Resident'
    if 'Migratory' in status_str: return 'Migratory'
    if 'Winter' in status_str: return 'Winter'
    if 'Passage' in status_str: return 'Passage'
    if 'Vagrant' in status_str: return 'Vagrant'
    
    return None

def clean_text(val):
    """Helper to return None instead of empty strings for the database"""
    cleaned = str(val).strip()
    return cleaned if cleaned else None

def main():
    print("🚀 Starting Comprehensive Data Upload to 'birds' table...\n")
    
    try:
        # header=1 skips the weird blank formatting row
        df = pd.read_csv(CSV_FILE, header=1)
        df = df.fillna('') 
        print(f"✅ Loaded {len(df)} birds from CSV!\n")
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return

    success_count = 0
    images_uploaded = 0
    
    for index, row in df.iterrows():
        common_name = clean_text(row.get('Common Name', ''))
        
        # Skip rows with no name
        if not common_name:
            continue 
            
        print(f"Processing ({index+1}/{len(df)}): {common_name}...")
        
        # 2. Handle Image Uploads
        local_path, filename = get_image_path(common_name)
        public_url = None
        
        if local_path:
            storage_path = f"thumbnails/{filename}"
            try:
                with open(local_path, 'rb') as f:
                    supabase.storage.from_(BUCKET_NAME).upload(
                        path=storage_path, file=f, file_options={"x-upsert": "true"}
                    )
                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
                print(f"  📸 Image uploaded!")
                images_uploaded += 1
            except Exception as e:
                print(f"  ❌ Image upload failed: {e}")
        else:
            print(f"  ⚠️ No image found. Proceeding with text data only.")
            
        # 3. Map EVERY CSV column to the new SQL Schema
        db_data = {
            "common_name": common_name,
            "scientific_name": clean_text(row.get('Scientific Name', '')),
            "bengali_name": clean_text(row.get('Local Bengali Name', '')),
            "family": clean_text(row.get('Family', '')),
            "category": clean_text(row.get('Category', '')),
            "iucn_status": clean_text(row.get('IUCN Status', '')),
            "wpa_schedule": clean_text(row.get('Wildlife Protection Act schedule', '')),
            "status": clean_status(row.get('Migratory Status', '')),
            "size_approx": clean_text(row.get('Size (Aprox)', '')),
            "description": clean_text(row.get('Description', '')),
            # Notice the space after 'Male Description ' to match your exact CSV header!
            "male_description": clean_text(row.get('Male Description ', '')),
            "female_description": clean_text(row.get('Female Description', '')),
            "distribution": clean_text(row.get('Distribution', '')),
            "subspecies": clean_text(row.get('Subspecies', '')),
            "similar_species": clean_text(row.get('Similar Species', '')),
            "note": clean_text(row.get('Note', '')),
            "image_url": public_url
        }
        
        try:
            supabase.table('birds').insert(db_data).execute()
            print(f"  ✅ Saved to Database!")
            success_count += 1
        except Exception as e:
            print(f"  ❌ Database error: {e}")
            
    print(f"\n🎉 Comprehensive Migration Complete!")
    print(f"📊 Total Birds Saved to 'birds' table: {success_count} / {len(df)}")
    print(f"📸 Total Images Uploaded: {images_uploaded}")

if __name__ == "__main__":
    main()