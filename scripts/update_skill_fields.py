#!/usr/bin/env python3
"""
Update marketplace.json and claude-plugins.json with new fields:
- owner: GitHub owner/org
- repo: GitHub repo name  
- skill_slug: Skill identifier within repo
- skill_md_url: Raw GitHub URL to SKILL.md

This script:
1. Parses existing source URLs to extract owner/repo
2. Cleans up URLs (removes tree/main/ patterns)
3. Adds new metadata fields
4. Optionally validates SKILL.md existence

Usage:
    python update_skill_fields.py [--validate] [--input marketplace.json]
"""

import json
import re
import argparse
from pathlib import Path
from typing import Optional
import requests
import time


def parse_github_url(url: str) -> dict:
    """
    Parse a GitHub URL and extract owner, repo, and skill path.
    
    Handles various formats:
    - https://github.com/owner/repo/tree/main/skills/skill-name
    - https://github.com/owner/repo
    - https://github.com/owner/repo/blob/main/path/to/SKILL.md
    """
    if not url:
        return {"owner": "", "repo": "", "skill_slug": "", "path": ""}
    
    # Clean URL
    url = url.strip().rstrip("/")
    
    # Extract owner/repo pattern
    match = re.match(r'https?://github\.com/([^/]+)/([^/]+)(?:/(.*))?', url)
    if not match:
        return {"owner": "", "repo": "", "skill_slug": "", "path": ""}
    
    owner = match.group(1)
    repo = match.group(2).replace(".git", "")
    rest = match.group(3) or ""
    
    # Remove tree/main or tree/master or blob/main etc.
    rest = re.sub(r'^(tree|blob)/(main|master)/?', '', rest)
    
    # Try to extract skill name from path
    skill_slug = ""
    
    # Pattern: skills/skill-name
    skill_match = re.search(r'skills/([^/]+)', rest)
    if skill_match:
        skill_slug = skill_match.group(1)
    
    # Pattern: path ending in a skill directory name
    if not skill_slug and rest:
        parts = rest.split('/')
        # Get last non-empty part that's not a file
        for part in reversed(parts):
            if part and not part.endswith('.md'):
                skill_slug = part
                break
    
    return {
        "owner": owner,
        "repo": repo,
        "skill_slug": skill_slug,
        "path": rest
    }


def clean_github_url(url: str) -> str:
    """
    Clean a GitHub URL to a consistent format.
    Removes tree/main/ patterns and normalizes.
    """
    if not url:
        return url
    
    # Parse and reconstruct
    parsed = parse_github_url(url)
    if not parsed["owner"] or not parsed["repo"]:
        return url
    
    base = f"https://github.com/{parsed['owner']}/{parsed['repo']}"
    if parsed["path"]:
        return f"{base}/{parsed['path']}"
    return base


def guess_skill_md_url(owner: str, repo: str, skill_slug: str, source_path: str = "") -> list[str]:
    """
    Generate possible raw GitHub URLs where SKILL.md might be located.
    Returns a list of URLs to try.
    """
    base = f"https://raw.githubusercontent.com/{owner}/{repo}/main"
    
    urls = []
    
    # If we have a source path, try that first
    if source_path:
        if source_path.endswith('SKILL.md'):
            urls.append(f"{base}/{source_path}")
        else:
            urls.append(f"{base}/{source_path}/SKILL.md")
    
    # Common patterns
    if skill_slug:
        urls.extend([
            f"{base}/skills/{skill_slug}/SKILL.md",
            f"{base}/{skill_slug}/SKILL.md",
            f"{base}/plugins/{skill_slug}/skills/{skill_slug}/SKILL.md",
        ])
    
    # Also try master branch
    master_base = f"https://raw.githubusercontent.com/{owner}/{repo}/master"
    if skill_slug:
        urls.append(f"{master_base}/skills/{skill_slug}/SKILL.md")
    
    return list(dict.fromkeys(urls))  # Remove duplicates while preserving order


def validate_skill_md_url(url: str) -> bool:
    """Check if a SKILL.md URL exists."""
    try:
        response = requests.head(url, timeout=5)
        return response.status_code == 200
    except:
        return False


def find_valid_skill_md_url(owner: str, repo: str, skill_slug: str, source_path: str = "") -> Optional[str]:
    """Find a valid SKILL.md URL by trying multiple patterns."""
    urls = guess_skill_md_url(owner, repo, skill_slug, source_path)
    
    for url in urls:
        if validate_skill_md_url(url):
            return url
        time.sleep(0.1)  # Rate limiting
    
    return None


def update_skill(skill: dict, validate: bool = False) -> dict:
    """Update a skill entry with new fields."""
    source = skill.get("source", "") or skill.get("github_url", "") or ""
    
    # Parse source URL
    parsed = parse_github_url(source)
    
    # Add new fields
    skill["owner"] = parsed["owner"]
    skill["repo"] = parsed["repo"]
    skill["skill_slug"] = parsed["skill_slug"] or skill.get("id", "")
    
    # Clean the source URL
    if source:
        skill["source"] = clean_github_url(source)
    
    # Generate skill_md_url
    if parsed["owner"] and parsed["repo"]:
        possible_urls = guess_skill_md_url(
            parsed["owner"], 
            parsed["repo"], 
            skill["skill_slug"],
            parsed["path"]
        )
        skill["skill_md_url"] = possible_urls[0] if possible_urls else ""
        
        # Validate if requested
        if validate:
            valid_url = find_valid_skill_md_url(
                parsed["owner"],
                parsed["repo"],
                skill["skill_slug"],
                parsed["path"]
            )
            if valid_url:
                skill["skill_md_url"] = valid_url
                skill["skill_md_validated"] = True
            else:
                skill["skill_md_validated"] = False
    else:
        skill["skill_md_url"] = ""
    
    return skill


def update_marketplace_json(input_path: str, output_path: str = None, validate: bool = False) -> None:
    """Update marketplace.json with new fields."""
    print(f"Loading {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    skills = data.get("skills", [])
    print(f"Found {len(skills)} skills")
    
    for i, skill in enumerate(skills, 1):
        print(f"  [{i}/{len(skills)}] {skill.get('id', 'unknown')}")
        update_skill(skill, validate)
    
    # Update metadata
    data["metadata"]["updated_at"] = "2026-01-21T09:52:00Z"
    data["specs"]["skill_fields"] = [
        "owner", "repo", "skill_slug", "skill_md_url"
    ]
    
    output = output_path or input_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nUpdated {len(skills)} skills in {output}")


def update_claude_plugins_json(input_path: str, output_path: str = None, validate: bool = False) -> None:
    """Update claude-plugins.json with new fields."""
    print(f"Loading {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # claude-plugins.json might have different structure
    if isinstance(data, list):
        skills = data
    else:
        skills = data.get("plugins", []) or data.get("skills", [])
    
    print(f"Found {len(skills)} plugins/skills")
    
    for i, skill in enumerate(skills, 1):
        if i % 100 == 0:
            print(f"  Processing {i}/{len(skills)}...")
        update_skill(skill, validate)
    
    # Save
    output = output_path or input_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nUpdated {len(skills)} entries in {output}")


def main():
    parser = argparse.ArgumentParser(description="Update skill JSON files with new metadata fields")
    parser.add_argument("--marketplace", "-m", default="marketplace.json",
                       help="Path to marketplace.json")
    parser.add_argument("--plugins", "-p", default="claude-plugins.json",
                       help="Path to claude-plugins.json")
    parser.add_argument("--validate", "-v", action="store_true",
                       help="Validate SKILL.md URLs exist")
    parser.add_argument("--only", choices=["marketplace", "plugins"],
                       help="Only update one file")
    
    args = parser.parse_args()
    
    if args.only != "plugins":
        if Path(args.marketplace).exists():
            update_marketplace_json(args.marketplace, validate=args.validate)
        else:
            print(f"Warning: {args.marketplace} not found")
    
    if args.only != "marketplace":
        if Path(args.plugins).exists():
            update_claude_plugins_json(args.plugins, validate=args.validate)
        else:
            print(f"Warning: {args.plugins} not found")


if __name__ == "__main__":
    main()
