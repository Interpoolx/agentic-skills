#!/usr/bin/env python3
"""
GitHub Skill Validator

This utility validates GitHub skill repositories:
1. Checks if the repo exists
2. Searches for SKILL.md in common locations
3. Parses and validates SKILL.md frontmatter
4. Returns the valid SKILL.md URL and extracted metadata

Usage:
    python validate_github_skill.py owner/repo
    python validate_github_skill.py https://github.com/owner/repo
"""

import re
import json
import argparse
import requests
import yaml
from typing import Optional
from dataclasses import dataclass


GITHUB_API = "https://api.github.com"
GITHUB_RAW = "https://raw.githubusercontent.com"


@dataclass
class SkillValidationResult:
    """Result of skill validation"""
    valid: bool
    owner: str
    repo: str
    skill_slug: str
    skill_name: str
    description: str
    version: str
    license: str
    skill_md_url: str
    skill_md_path: str
    error: str = ""
    
    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "owner": self.owner,
            "repo": self.repo,
            "skill_slug": self.skill_slug,
            "skill_name": self.skill_name,
            "description": self.description,
            "version": self.version,
            "license": self.license,
            "skill_md_url": self.skill_md_url,
            "skill_md_path": self.skill_md_path,
            "error": self.error
        }


def parse_input(input_str: str) -> tuple[str, str]:
    """Parse owner/repo from various input formats"""
    input_str = input_str.strip()
    
    # Handle full URL
    if "github.com" in input_str:
        match = re.search(r'github\.com/([^/]+)/([^/\?#]+)', input_str)
        if match:
            return match.group(1), match.group(2).replace(".git", "")
    
    # Handle owner/repo format
    if "/" in input_str:
        parts = input_str.split("/")
        return parts[0], parts[1]
    
    return "", ""


def check_repo_exists(owner: str, repo: str) -> bool:
    """Check if a GitHub repo exists using HTML page (avoids API rate limits)"""
    try:
        response = requests.head(f"https://github.com/{owner}/{repo}", timeout=10)
        return response.status_code == 200
    except:
        return False


def find_skill_md(owner: str, repo: str) -> list[tuple[str, str]]:
    """
    Search for SKILL.md files in a repository.
    Returns list of (path, raw_url) tuples.
    Uses raw URL checks to avoid API rate limits.
    """
    found = []
    
    # Common pattern locations to try directly
    patterns_to_try = [
        "SKILL.md",
        "skill.md",
        "skills/SKILL.md",
    ]
    
    # Try all patterns for both main and master branches
    for pattern in patterns_to_try:
        for branch in ["main", "master"]:
            url = f"{GITHUB_RAW}/{owner}/{repo}/{branch}/{pattern}"
            try:
                response = requests.head(url, timeout=5)
                if response.status_code == 200:
                    found.append((pattern, url))
            except:
                continue
    
    # Try common skill-named patterns
    # For expo/skills, try known skill names
    known_skills = [
        "upgrading-expo",
        "use-dom", 
        "building-ui",
        "deployment",
        "data-fetching",
        "expo-deployment",
        "expo-app-design"
    ]
    
    for skill in known_skills:
        for branch in ["main", "master"]:
            # Try skills/{skill}/SKILL.md
            url = f"{GITHUB_RAW}/{owner}/{repo}/{branch}/skills/{skill}/SKILL.md"
            try:
                response = requests.head(url, timeout=3)
                if response.status_code == 200:
                    found.append((f"skills/{skill}/SKILL.md", url))
                    continue
            except:
                pass
            
            # Try plugins/{skill}/skills/{skill}/SKILL.md (expo-style)
            url = f"{GITHUB_RAW}/{owner}/{repo}/{branch}/plugins/{skill}/skills/{skill}/SKILL.md"
            try:
                response = requests.head(url, timeout=3)
                if response.status_code == 200:
                    found.append((f"plugins/{skill}/skills/{skill}/SKILL.md", url))
            except:
                pass
    
    # Try API-based discovery if we haven't found anything and want to be thorough
    # This may fail due to rate limits but we try anyway
    if not found:
        try:
            response = requests.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents",
                timeout=10
            )
            if response.status_code == 200:
                contents = response.json()
                # Search in skills/ and plugins/ directories
                for item in contents:
                    if item.get("type") == "dir" and item.get("name") in ["skills", "plugins"]:
                        dir_name = item.get("name")
                        try:
                            dir_response = requests.get(
                                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{dir_name}",
                                timeout=10
                            )
                            if dir_response.status_code == 200:
                                dir_contents = dir_response.json()
                                for subdir in dir_contents:
                                    if subdir.get("type") == "dir":
                                        skill_name = subdir.get("name")
                                        for branch in ["main", "master"]:
                                            url = f"{GITHUB_RAW}/{owner}/{repo}/{branch}/{dir_name}/{skill_name}/SKILL.md"
                                            try:
                                                response = requests.head(url, timeout=3)
                                                if response.status_code == 200:
                                                    found.append((f"{dir_name}/{skill_name}/SKILL.md", url))
                                                    break
                                            except:
                                                continue
                        except:
                            pass
        except:
            pass
    
    return found


def parse_skill_md(content: str) -> dict:
    """Parse SKILL.md YAML frontmatter"""
    result = {
        "name": "",
        "description": "",
        "version": "1.0.0",
        "license": "",
        "author": ""
    }
    
    if not content.startswith("---"):
        return result
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        return result
    
    try:
        frontmatter = yaml.safe_load(parts[1])
        if isinstance(frontmatter, dict):
            result["name"] = frontmatter.get("name", "")
            result["description"] = frontmatter.get("description", "")
            result["version"] = frontmatter.get("version", "1.0.0")
            result["license"] = frontmatter.get("license", "")
            
            author = frontmatter.get("author")
            if isinstance(author, dict):
                result["author"] = author.get("name", "")
            elif author:
                result["author"] = str(author)
    except yaml.YAMLError:
        pass
    
    return result


def validate_skill(input_str: str) -> SkillValidationResult:
    """
    Validate a GitHub skill repository.
    
    Returns validation result with skill details if valid.
    """
    owner, repo = parse_input(input_str)
    
    if not owner or not repo:
        return SkillValidationResult(
            valid=False, owner="", repo="", skill_slug="",
            skill_name="", description="", version="", license="",
            skill_md_url="", skill_md_path="",
            error="Invalid input format. Use owner/repo or GitHub URL."
        )
    
    # Check repo exists
    if not check_repo_exists(owner, repo):
        return SkillValidationResult(
            valid=False, owner=owner, repo=repo, skill_slug="",
            skill_name="", description="", version="", license="",
            skill_md_url="", skill_md_path="",
            error=f"Repository {owner}/{repo} not found or not accessible."
        )
    
    # Find SKILL.md files
    skill_files = find_skill_md(owner, repo)
    
    if not skill_files:
        return SkillValidationResult(
            valid=False, owner=owner, repo=repo, skill_slug="",
            skill_name="", description="", version="", license="",
            skill_md_url="", skill_md_path="",
            error="No SKILL.md file found in repository."
        )
    
    # Use first found SKILL.md
    skill_path, skill_url = skill_files[0]
    
    # Fetch and parse SKILL.md
    try:
        response = requests.get(skill_url, timeout=10)
        response.raise_for_status()
        content = response.text
        parsed = parse_skill_md(content)
    except Exception as e:
        return SkillValidationResult(
            valid=False, owner=owner, repo=repo, skill_slug="",
            skill_name="", description="", version="", license="",
            skill_md_url=skill_url, skill_md_path=skill_path,
            error=f"Failed to parse SKILL.md: {e}"
        )
    
    # Extract skill_slug from path
    skill_slug = parsed["name"]
    if not skill_slug:
        # Fallback to directory name
        path_parts = skill_path.split("/")
        for i, part in enumerate(path_parts):
            if part in ["skills", "plugins"] and i + 1 < len(path_parts):
                skill_slug = path_parts[i + 1]
                break
        if not skill_slug:
            skill_slug = repo
    
    return SkillValidationResult(
        valid=True,
        owner=owner,
        repo=repo,
        skill_slug=skill_slug,
        skill_name=parsed["name"] or skill_slug,
        description=parsed["description"],
        version=parsed["version"],
        license=parsed["license"],
        skill_md_url=skill_url,
        skill_md_path=skill_path
    )


def main():
    parser = argparse.ArgumentParser(description="Validate a GitHub skill repository")
    parser.add_argument("repo", help="Repository in owner/repo format or GitHub URL")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    parser.add_argument("--all", "-a", action="store_true", help="Find all SKILL.md files in repo")
    
    args = parser.parse_args()
    
    result = validate_skill(args.repo)
    
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        if result.valid:
            print(f"✓ Valid skill repository found!")
            print(f"")
            print(f"  Owner:        {result.owner}")
            print(f"  Repo:         {result.repo}")
            print(f"  Skill Name:   {result.skill_name}")
            print(f"  Skill Slug:   {result.skill_slug}")
            print(f"  Description:  {result.description[:80]}..." if len(result.description) > 80 else f"  Description:  {result.description}")
            print(f"  Version:      {result.version}")
            print(f"  License:      {result.license}")
            print(f"  SKILL.md:     {result.skill_md_url}")
        else:
            print(f"✗ Invalid: {result.error}")
    
    if args.all and result.valid:
        owner, repo = parse_input(args.repo)
        all_files = find_skill_md(owner, repo)
        print(f"\nAll SKILL.md files found ({len(all_files)}):")
        for path, url in all_files:
            print(f"  - {path}")


if __name__ == "__main__":
    main()
