import pandas as pd
from supabase import create_client, Client

# --- CONFIGURATION ---
SUPABASE_URL = "https://qdnmqhcbciwmegjsfifw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbm1xaGNiY2l3bWVnanNmaWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgzNTIzMSwiZXhwIjoyMDc5NDExMjMxfQ.A7tRT82MnNQuyFiKVnGpR1CSM2HfRct0yf3gaYqcz6Y" # Use your service_role key for bulk inserts to bypass RLS if needed

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- READ EXCEL ---
# Ensure the filename matches what you uploaded
excel_path = '/Users/sayantan_banerjee/Documents/EKW-Bird_Trail_App/BOTH/bird-trail-admin/birdtrails-admin-react/src/python/Content For Bird App (2).xlsx'
df = pd.read_excel(excel_path, header=1)

# --- CLEAN & PREPARE DATA ---
records = []
for idx, row in df.iterrows():
    common_name = str(row['Common Name']).strip() if pd.notnull(row['Common Name']) else ""

    # Generate a clean image filename key (e.g. "asian_brown_flycatcher.jpg")
    image_filename = f"{common_name.lower().replace(' ', '_').replace('-', '_')}.jpg"

    record = {
        "common_name": common_name,
        "scientific_name": str(row['Scientific Name']).strip() if pd.notnull(row['Scientific Name']) else "",
        "local_bengali_name": str(row['Local Bengali Name']).strip() if pd.notnull(row['Local Bengali Name']) else "",
        "primary_colour": str(row['Primary Colour']).strip() if pd.notnull(row['Primary Colour']) else "",
        "size_category": str(row['Size']).strip() if pd.notnull(row['Size']) else "",
        "image_name": image_filename,
        "description": str(row['Description']).strip() if pd.notnull(row['Description']) else ""
    }
    records.append(record)

# --- INSERT INTO SUPABASE ---
response = supabase.table('bird_wizard_directory').insert(records).execute()
print(f"Successfully inserted {len(records)} bird records into Supabase!")