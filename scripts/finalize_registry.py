import json
import os
import hashlib

def get_skill_id(skill):
    # Try to use existing ID
    skill_id = skill.get('id')
    if skill_id:
        return skill_id
    
    # Generate from owner/repo/slug if missing
    owner = skill.get('owner', '')
    repo = skill.get('repo', '')
    slug = skill.get('skill_slug', '')
    if owner and repo and slug:
        key = f"{owner}/{repo}/{slug}"
        return hashlib.md5(key.encode()).hexdigest()[:12]
    
    # Fallback to source URL
    source = skill.get('source') or skill.get('github_url') or skill.get('gitUrl', '')
    if source:
        return hashlib.md5(source.encode()).hexdigest()[:12]
    
    return None

def main():
    reg_path = 'data/skills_registry.json'
    crawled_path = 'skills_sh_crawled.json'
    output_dir = 'data/registry_chunks'
    chunk_size = 2000

    print(f"Loading {reg_path}...")
    with open(reg_path, 'r', encoding='utf-8') as f:
        registry = json.load(f)
    
    skills = registry.get('skills', [])
    print(f"Registry has {len(skills)} skills.")

    print(f"Loading {crawled_path}...")
    with open(crawled_path, 'r', encoding='utf-8') as f:
        crawled_data = json.load(f)
    
    # Note: crawled_data might be a list or a dict with 'skills' key
    if isinstance(crawled_data, dict):
        crawled_skills = crawled_data.get('skills', [])
    else:
        crawled_skills = crawled_data

    print(f"Crawled data has {len(crawled_skills)} skills.")

    # Deduplication map
    # We'll use a set of (owner, repo, skill_slug) for tracking
    seen_keys = set()
    for s in skills:
        owner = s.get('owner', '').lower()
        repo = s.get('repo', '').lower()
        slug = s.get('skill_slug', '').lower()
        if owner and repo and slug:
            seen_keys.add((owner, repo, slug))

    merged_count = 0
    for s in crawled_skills:
        owner = s.get('owner', '').lower()
        repo = s.get('repo', '').lower()
        slug = s.get('skill_slug', '').lower()
        
        # Ensure ID exists
        if not s.get('id'):
            s['id'] = get_skill_id(s)

        key = (owner, repo, slug)
        if key == ('', '', ''):
           # Use ID as fallback key
           key = s.get('id')
        
        if key not in seen_keys:
            skills.append(s)
            seen_keys.add(key)
            merged_count += 1

    print(f"Merged {merged_count} new skills from skills.sh.")
    print(f"Total skills now: {len(skills)}")

    # Update metadata
    registry['skills'] = skills
    registry['total_skills'] = len(skills)
    registry['updated_at'] = '2026-01-21T11:55:00Z'

    # Save final merged registry
    with open(reg_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)
    print(f"Saved merged registry to {reg_path}")

    # Field validation
    fields = ['owner', 'repo', 'skill_slug', 'skill_md_url']
    counts = {f: 0 for f in fields}
    for s in skills:
        for f in fields:
            if s.get(f):
                counts[f] += 1
    
    print("\nField Coverage:")
    for f in fields:
        print(f"  {f}: {counts[f]}/{len(skills)} ({100*counts[f]/len(skills):.1f}%)")

    # Chunking
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory {output_dir}")

    num_chunks = (len(skills) + chunk_size - 1) // chunk_size
    for i in range(num_chunks):
        start = i * chunk_size
        end = min((i + 1) * chunk_size, len(skills))
        chunk_skills = skills[start:end]
        
        chunk_data = {
            'chunk_num': i + 1,
            'total_chunks': num_chunks,
            'count': len(chunk_skills),
            'skills': chunk_skills
        }
        
        chunk_file = os.path.join(output_dir, f"agenticskills-registry-part-{i+1}.json")
        with open(chunk_file, 'w', encoding='utf-8') as f:
            json.dump(chunk_data, f, indent=2, ensure_ascii=False)
        print(f"Saved {chunk_file}")

if __name__ == "__main__":
    main()
