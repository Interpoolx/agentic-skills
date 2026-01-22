#!/usr/bin/env python3
"""
Import skills from crawled skills.sh JSON data into the database.

This script reads the JSON file created by crawl_skills_sh.py and imports
the skills into the database via the API.

Usage:
    python import_skills_sh.py [--input skills_sh_crawled.json] [--api-url URL]
"""

import json
import argparse
import requests
import time
from pathlib import Path


DEFAULT_API_URL = "https://ralphy-skills.ralphy-sh.workers.dev"
# For local development: "http://localhost:8787"


def load_crawled_data(input_path: str) -> list[dict]:
    """Load crawled skills data from JSON file"""
    with open(input_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def transform_skill_for_api(skill: dict) -> dict:
    """Transform crawled skill data to match API expected format"""
    return {
        "id": skill.get("id"),
        "name": skill.get("name"),
        "description": skill.get("description", "")[:500],  # Limit length
        "category": skill.get("category", "general"),
        "tags": skill.get("tags", "[]"),
        "author": skill.get("author", skill.get("owner", "")),
        "version": skill.get("version", "1.0.0"),
        "license": skill.get("license", ""),
        "github_url": skill.get("github_url", ""),
        "github_owner": skill.get("owner", ""),
        "github_repo": skill.get("repo", ""),
        "install_count": skill.get("skillssh_installs", 0),
        "import_source": "skillssh",
        "platform": "global",
        "namespace": f"{skill.get('owner')}/{skill.get('repo')}",
        "metadata": json.dumps({
            "skill_slug": skill.get("skill_slug"),
            "skill_md_url": skill.get("skill_md_url", ""),
            "skillssh_rank": skill.get("skillssh_rank", 0),
            "skill_md_content": skill.get("skill_md_content", "")[:5000],  # Limit content size
        }),
        "status": "published",
        "is_verified": 1 if skill.get("skill_md_content") else 0,  # Verified if we have SKILL.md
    }


def import_skill(api_url: str, skill_data: dict) -> tuple[bool, str]:
    """Import a single skill via the API"""
    try:
        response = requests.post(
            f"{api_url}/api/skills",
            json=skill_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            return True, "Success"
        elif response.status_code == 409:
            return True, "Already exists"
        else:
            return False, f"HTTP {response.status_code}: {response.text[:100]}"
    except requests.RequestException as e:
        return False, str(e)


def import_skills_bulk(api_url: str, skills: list[dict], admin_token: str) -> tuple[bool, str]:
    """Import skills in bulk via the admin API"""
    try:
        response = requests.post(
            f"{api_url}/api/admin/import",
            json={
                "skills": skills,
                "import_source": "skillssh",
                "platform": "global"
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}"
            },
            timeout=120
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            return True, f"Imported {result.get('imported', 0)}, Errors: {result.get('errors', 0)}"
        elif response.status_code == 401:
            return False, "Unauthorized - check ADMIN_TOKEN"
        else:
            return False, f"HTTP {response.status_code}: {response.text[:200]}"
    except requests.RequestException as e:
        return False, str(e)


def main():
    import os
    
    parser = argparse.ArgumentParser(description="Import crawled skills.sh data to database")
    parser.add_argument("--input", "-i", default="skills_sh_crawled.json",
                       help="Input JSON file from crawler")
    parser.add_argument("--api-url", "-u", default=DEFAULT_API_URL,
                       help="API base URL")
    parser.add_argument("--admin-token", "-t", default=os.environ.get("RALPHY_ADMIN_TOKEN", "ralphy-default-admin-token"),
                       help="Admin token for API auth (or set RALPHY_ADMIN_TOKEN env var)")
    parser.add_argument("--batch-size", "-b", type=int, default=50,
                       help="Batch size for bulk import")
    parser.add_argument("--dry-run", "-d", action="store_true",
                       help="Don't actually import, just show what would be done")
    
    args = parser.parse_args()
    
    # Load data
    print(f"Loading data from {args.input}...")
    try:
        skills = load_crawled_data(args.input)
    except FileNotFoundError:
        print(f"Error: File not found: {args.input}")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}")
        return
    
    print(f"Loaded {len(skills)} skills")
    
    # Transform data
    print("Transforming data for API...")
    api_skills = [transform_skill_for_api(skill) for skill in skills]
    
    # Filter to only skills with content
    skills_with_md = [s for s in api_skills if s.get("is_verified")]
    print(f"Skills with SKILL.md content: {len(skills_with_md)}")
    
    if args.dry_run:
        print("\n[DRY RUN] Would import the following skills:")
        for i, skill in enumerate(api_skills[:10], 1):
            print(f"  {i}. {skill['name']} ({skill['github_owner']}/{skill['github_repo']})")
        if len(api_skills) > 10:
            print(f"  ... and {len(api_skills) - 10} more")
        return
    
    # Import in batches
    print(f"\nImporting {len(api_skills)} skills to {args.api_url}...")
    
    imported = 0
    failed = 0
    
    for i in range(0, len(api_skills), args.batch_size):
        batch = api_skills[i:i + args.batch_size]
        batch_num = i // args.batch_size + 1
        total_batches = (len(api_skills) + args.batch_size - 1) // args.batch_size
        
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} skills)...", end=" ")
        
        success, message = import_skills_bulk(args.api_url, batch, args.admin_token)
        
        if success:
            print(f"✓ {message}")
            imported += len(batch)
        else:
            print(f"✗ {message}")
            # Try individual import as fallback
            for skill in batch:
                success, msg = import_skill(args.api_url, skill)
                if success:
                    imported += 1
                else:
                    failed += 1
        
        time.sleep(0.5)  # Rate limiting
    
    print(f"\nImport complete!")
    print(f"  Imported: {imported}")
    print(f"  Failed: {failed}")


if __name__ == "__main__":
    main()
