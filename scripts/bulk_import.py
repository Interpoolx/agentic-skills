import json
import requests
import os
import time

def import_chunk(file_path, api_url, token):
    print(f"Importing {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # The chunk structure has 'skills' key
    skills = data.get('skills', [])
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'skills': skills,
        'import_source': 'bulk_init',
        'platform': 'global'
    }
    
    try:
        response = requests.post(f"{api_url}/api/admin/import", json=payload, headers=headers, timeout=60)
        if response.status_code == 200:
            result = response.json()
            print(f"  Success: Imported {result.get('imported', 0)} skills, {result.get('errors', 0)} errors.")
            return True
        else:
            print(f"  Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"  Exception: {e}")
        return False

def main():
    api_url = "http://127.0.0.1:8787"
    token = "ralphy-default-admin-token"
    chunks_dir = "data/registry_chunks"
    
    if not os.path.exists(chunks_dir):
        print(f"Error: Directory {chunks_dir} not found.")
        return

    chunk_files = sorted([f for f in os.listdir(chunks_dir) if f.startswith('agenticskills-registry-part-')])
    
    print(f"Found {len(chunk_files)} chunks to import.")
    
    start_time = time.time()
    total_imported = 0
    total_errors = 0
    
    for filename in chunk_files:
        path = os.path.join(chunks_dir, filename)
        # Load count for summary
        with open(path, 'r', encoding='utf-8') as f:
            c = json.load(f).get('count', 0)
        
        if import_chunk(path, api_url, token):
            total_imported += c
        else:
            total_errors += c
        
        # Short sleep to prevent overwhelming the local worker
        time.sleep(1)

    duration = time.time() - start_time
    print("\n" + "="*30)
    print("Import Summary")
    print("="*30)
    print(f"Total processed: {total_imported + total_errors}")
    print(f"Success: {total_imported}")
    print(f"Failed: {total_errors}")
    print(f"Time taken: {duration:.2f} seconds")

if __name__ == "__main__":
    main()
