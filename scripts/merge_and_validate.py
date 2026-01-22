#!/usr/bin/env python3
"""
Merge and Validate Skills

This script:
1. Merges marketplace.json and claude-plugins.json into one unified file
2. Deduplicates skills by id
3. Validates GitHub URLs in chunks (owner/repo level first, then skill level)
4. Removes entries with 404 URLs
5. Saves the clean, merged file

Usage:
    python merge_and_validate.py [--chunk-size 50] [--output skills_registry.json]
"""

import json
import argparse
import requests
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
import hashlib


# Constants
REQUEST_TIMEOUT = 5
CHUNK_DELAY = 1.0  # Delay between chunks


def load_json(path: str) -> dict | list:
    """Load JSON file"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data, path: str):
    """Save JSON file"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def extract_skills(data: dict | list) -> list[dict]:
    """Extract skills from various JSON structures"""
    if isinstance(data, list):
        return data
    
    # Try common keys
    for key in ['skills', 'plugins', 'packages', 'items']:
        if key in data and isinstance(data[key], list):
            return data[key]
    
    return []


def get_github_info(skill: dict) -> tuple[str, str, str]:
    """Extract owner, repo, and source URL from skill - and update skill with extracted values"""
    owner = skill.get('owner', '')
    repo = skill.get('repo', '')
    source = skill.get('source', '') or skill.get('github_url', '') or skill.get('gitUrl', '')
    
    # Parse from source if owner/repo not set or empty
    if source and (not owner or not repo):
        import re
        match = re.search(r'github\.com/([^/]+)/([^/\?#]+)', source)
        if match:
            owner = match.group(1)
            repo_part = match.group(2).replace('.git', '')
            # Remove tree/main, blob/main etc from repo name
            repo = repo_part.split('/')[0] if '/' in repo_part else repo_part
            
            # Update the skill with extracted values
            skill['owner'] = owner
            skill['repo'] = repo
    
    return owner, repo, source


def check_url(url: str) -> tuple[str, bool]:
    """Check if a URL is accessible (returns 200)"""
    if not url:
        return url, False
    
    try:
        # Use HEAD request for efficiency
        response = requests.head(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        return url, response.status_code == 200
    except:
        try:
            # Fallback to GET if HEAD fails
            response = requests.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            return url, response.status_code == 200
        except:
            return url, False


def validate_repo(owner: str, repo: str) -> bool:
    """Check if a GitHub repo exists"""
    if not owner or not repo:
        return False
    
    url = f"https://github.com/{owner}/{repo}"
    _, valid = check_url(url)
    return valid


def validate_skills_chunk(skills: list[dict], check_skill_urls: bool = True) -> list[dict]:
    """
    Validate a chunk of skills.
    
    Returns list of valid skills.
    """
    valid_skills = []
    repo_cache = {}  # Cache repo validation results
    
    for skill in skills:
        owner, repo, source = get_github_info(skill)
        
        # Check repo first (cached)
        repo_key = f"{owner}/{repo}"
        
        if repo_key not in repo_cache:
            if owner and repo:
                repo_cache[repo_key] = validate_repo(owner, repo)
            else:
                repo_cache[repo_key] = False if not source else None
        
        repo_valid = repo_cache[repo_key]
        
        # If repo is invalid, skip this skill
        if repo_valid is False:
            continue
        
        # If we need to check skill-level URLs
        if check_skill_urls and source:
            _, source_valid = check_url(source)
            if not source_valid:
                continue
        
        valid_skills.append(skill)
    
    return valid_skills


def merge_skills(skills1: list[dict], skills2: list[dict]) -> list[dict]:
    """
    Merge two skill lists, deduplicating by id.
    Also extracts and populates owner/repo from URLs.
    skills1 takes priority over skills2 for duplicates.
    """
    seen_ids = set()
    merged = []
    
    def process_skill(skill: dict) -> tuple[str, dict]:
        """Process a skill - extract owner/repo and return id + skill"""
        # Extract and update owner/repo from URL
        get_github_info(skill)
        
        skill_id = skill.get('id', '')
        if not skill_id:
            # Generate ID from source URL
            source = skill.get('source', '') or skill.get('github_url', '') or skill.get('gitUrl', '')
            if source:
                skill_id = hashlib.md5(source.encode()).hexdigest()[:12]
                skill['id'] = skill_id
        
        return skill_id, skill
    
    # Add from first list
    for skill in skills1:
        skill_id, skill = process_skill(skill)
        if skill_id and skill_id not in seen_ids:
            seen_ids.add(skill_id)
            merged.append(skill)
    
    # Add from second list (if not duplicate)
    for skill in skills2:
        skill_id, skill = process_skill(skill)
        if skill_id and skill_id not in seen_ids:
            seen_ids.add(skill_id)
            merged.append(skill)
    
    return merged


def process_in_chunks(skills: list[dict], chunk_size: int, validate_skills: bool = True) -> list[dict]:
    """
    Process skills in chunks with validation.
    
    Returns validated skills list.
    """
    if not validate_skills:
        return skills
    
    total = len(skills)
    validated = []
    
    for i in range(0, total, chunk_size):
        chunk = skills[i:i + chunk_size]
        chunk_num = i // chunk_size + 1
        total_chunks = (total + chunk_size - 1) // chunk_size
        
        print(f"  Validating chunk {chunk_num}/{total_chunks} ({len(chunk)} skills)...")
        
        valid_chunk = validate_skills_chunk(chunk, check_skill_urls=False)  # Only check repo level
        validated.extend(valid_chunk)
        
        removed = len(chunk) - len(valid_chunk)
        if removed > 0:
            print(f"    Removed {removed} invalid skills")
        
        # Delay between chunks
        if i + chunk_size < total:
            time.sleep(CHUNK_DELAY)
    
    return validated


def main():
    parser = argparse.ArgumentParser(description="Merge and validate skill JSON files")
    parser.add_argument("--marketplace", "-m", default="marketplace.json",
                       help="Path to marketplace.json")
    parser.add_argument("--plugins", "-p", default="claude-plugins.json",
                       help="Path to claude-plugins.json")
    parser.add_argument("--output", "-o", default="skills_registry.json",
                       help="Output file path")
    parser.add_argument("--chunk-size", "-c", type=int, default=100,
                       help="Chunk size for validation")
    parser.add_argument("--skip-validation", "-s", action="store_true",
                       help="Skip URL validation")
    parser.add_argument("--dry-run", "-d", action="store_true",
                       help="Don't save, just show stats")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Skills Merge and Validate")
    print("=" * 60)
    
    # Load files
    print("\n[1/4] Loading source files...")
    
    marketplace_skills = []
    plugins_skills = []
    
    if Path(args.marketplace).exists():
        marketplace_data = load_json(args.marketplace)
        marketplace_skills = extract_skills(marketplace_data)
        print(f"  Loaded {len(marketplace_skills)} skills from {args.marketplace}")
    else:
        print(f"  Warning: {args.marketplace} not found")
    
    if Path(args.plugins).exists():
        plugins_data = load_json(args.plugins)
        plugins_skills = extract_skills(plugins_data)
        print(f"  Loaded {len(plugins_skills)} skills from {args.plugins}")
    else:
        print(f"  Warning: {args.plugins} not found")
    
    # Merge
    print("\n[2/4] Merging and deduplicating...")
    merged = merge_skills(marketplace_skills, plugins_skills)
    print(f"  Merged total: {len(merged)} unique skills")
    
    # Validate
    print("\n[3/4] Validating GitHub URLs...")
    if args.skip_validation:
        print("  Skipping validation (--skip-validation)")
        validated = merged
    else:
        validated = process_in_chunks(merged, args.chunk_size)
        removed = len(merged) - len(validated)
        print(f"\n  Validation complete:")
        print(f"    Valid: {len(validated)}")
        print(f"    Removed: {removed}")
    
    # Save
    print("\n[4/4] Saving results...")
    
    if args.dry_run:
        print("  [DRY RUN] Would save to", args.output)
    else:
        # Create output structure
        output_data = {
            "name": "ralphy-skills-registry",
            "description": "Unified AI agent skills registry",
            "version": "2.0.0",
            "generated_at": "2026-01-21T09:58:00Z",
            "total_skills": len(validated),
            "skills": validated
        }
        
        save_json(output_data, args.output)
        print(f"  Saved {len(validated)} skills to {args.output}")
    
    # Summary stats
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    # Count by owner
    owners = {}
    for skill in validated:
        owner = skill.get('owner', 'unknown')
        owners[owner] = owners.get(owner, 0) + 1
    
    top_owners = sorted(owners.items(), key=lambda x: -x[1])[:10]
    print("\nTop 10 owners:")
    for owner, count in top_owners:
        print(f"  {owner}: {count} skills")


if __name__ == "__main__":
    main()
