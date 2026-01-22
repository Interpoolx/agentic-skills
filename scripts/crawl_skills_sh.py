#!/usr/bin/env python3
"""
Skills.sh Crawler v2

Crawls https://skills.sh/ to extract all skills and store them in our database.
This version uses a more thorough approach to find SKILL.md files and extracts
skill descriptions directly from the skills.sh skill pages.

URL Structure:
- https://skills.sh/{owner}/{repo}/{skill}
- Example: https://skills.sh/expo/skills/upgrading-expo

Usage:
    python crawl_skills_sh.py [--output skills_data.json] [--max-skills N]
"""

import re
import json
import time
import argparse
import uuid
from dataclasses import dataclass, asdict
from typing import Optional
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
import yaml


# Constants
SKILLS_SH_URL = "https://skills.sh"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com"
GITHUB_API_BASE = "https://api.github.com"
USER_AGENT = "RalphySkillsCrawler/2.0"
REQUEST_DELAY = 0.3  # Delay between requests

# Cache for repo structure to avoid repeat API calls
REPO_STRUCTURE_CACHE = {}


@dataclass
class Skill:
    """Skill data model matching our database schema"""
    id: str
    name: str
    description: str
    owner: str
    repo: str
    skill_slug: str
    version: str = "1.0.0"
    license: str = ""
    github_url: str = ""
    skill_md_url: str = ""
    skill_md_content: str = ""
    skillssh_rank: int = 0
    skillssh_installs: int = 0
    category: str = "general"
    tags: str = "[]"
    author: str = ""
    import_source: str = "skillssh"
    status: str = "published"


def fetch_page(url: str, delay: float = REQUEST_DELAY) -> Optional[str]:
    """Fetch a page with proper headers and rate limiting"""
    try:
        time.sleep(delay)
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"    [ERROR] Failed to fetch {url}: {e}")
        return None


def fetch_json(url: str, delay: float = REQUEST_DELAY) -> Optional[dict]:
    """Fetch JSON data from an API endpoint"""
    try:
        time.sleep(delay)
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json"
        }
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None


def fetch_raw_url(url: str) -> Optional[str]:
    """Fetch content from a raw URL"""
    try:
        time.sleep(REQUEST_DELAY / 2)
        response = requests.get(url, timeout=20)
        if response.status_code == 200:
            return response.text
        return None
    except:
        return None


def parse_install_count(text: str) -> int:
    """Parse install count from text like '1.2K' or '19.1K'"""
    if not text:
        return 0
    text = text.strip().upper()
    if "K" in text:
        return int(float(text.replace("K", "").replace(",", "")) * 1000)
    if "M" in text:
        return int(float(text.replace("M", "").replace(",", "")) * 1000000)
    try:
        return int(text.replace(",", ""))
    except ValueError:
        return 0


def fetch_skill_page_details(skill_url: str) -> dict:
    """Fetch skill details from the individual skill page on skills.sh"""
    html = fetch_page(skill_url)
    if not html:
        return {}
    
    soup = BeautifulSoup(html, "html.parser")
    
    result = {
        "description": "",
        "installs": 0
    }
    
    # Get description from meta tags
    for selector in ["meta[property='og:description']", "meta[name='description']"]:
        meta = soup.select_one(selector)
        if meta and meta.get("content"):
            desc = meta.get("content", "")
            if desc and desc != "Discover and install skills for AI agents.":
                result["description"] = desc
                break
    
    # Try to find description in page content - look for h1 then next text
    h1 = soup.find("h1")
    if h1 and not result["description"]:
        # Look for text content after h1
        for sibling in h1.find_next_siblings():
            text = sibling.get_text(strip=True)
            if text and len(text) > 20 and len(text) < 500:
                # Check if it's not just a list of links
                if not text.startswith("http") and not "skills" in text.lower():
                    result["description"] = text
                    break
    
    # Look for install count - typically shown as a number with K suffix
    page_text = soup.get_text()
    install_match = re.search(r'(\d+(?:\.\d+)?[KkMm]?)\s*(?:install|download|use)', page_text)
    if install_match:
        result["installs"] = parse_install_count(install_match.group(1))
    
    return result


def extract_skills_from_homepage(html: str) -> list[dict]:
    """Extract skill links and metadata from skills.sh homepage"""
    soup = BeautifulSoup(html, "html.parser")
    skills = []
    seen = set()  # Track seen skill urls to avoid duplicates
    
    # Pattern: /owner/repo/skill (but not /owner/repo which is just repo listing)
    skill_pattern = re.compile(r'^/([^/]+)/([^/]+)/([^/]+)$')
    
    # Skip patterns
    skip_owners = {"docs", "about", "login", "register", "privacy", "terms", "api"}
    
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        
        # Handle both relative and absolute URLs
        if href.startswith("https://skills.sh/"):
            href = "/" + "/".join(href.split("/")[3:])
        
        match = skill_pattern.match(href)
        if not match:
            continue
            
        owner, repo, skill_slug = match.groups()
        
        # Skip non-skill pages
        if owner.lower() in skip_owners:
            continue
        if skill_slug.lower() in ["skills", "plugins"]:
            continue
        
        skill_key = f"{owner}/{repo}/{skill_slug}"
        if skill_key in seen:
            continue
        seen.add(skill_key)
        
        # Try to find install count from sibling text
        installs = 0
        parent = link.parent
        if parent:
            parent_text = parent.get_text(separator=" ", strip=True)
            # Look for numbers with K suffix
            numbers = re.findall(r'(\d+(?:\.\d+)?K?)\s*$', parent_text)
            if numbers:
                installs = parse_install_count(numbers[-1])
        
        skills.append({
            "owner": owner,
            "repo": repo,
            "skill_slug": skill_slug,
            "url": f"{SKILLS_SH_URL}{href}",
            "installs": installs
        })
    
    return skills


def get_repo_contents(owner: str, repo: str, path: str = "") -> Optional[list]:
    """Get contents of a repo path, with caching"""
    cache_key = f"{owner}/{repo}/{path}"
    if cache_key in REPO_STRUCTURE_CACHE:
        return REPO_STRUCTURE_CACHE[cache_key]
    
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}".rstrip("/")
    result = fetch_json(url)
    REPO_STRUCTURE_CACHE[cache_key] = result
    return result


def check_raw_url_exists(url: str) -> bool:
    """Quick check if raw URL exists"""
    try:
        response = requests.head(url, timeout=5)
        return response.status_code == 200
    except:
        return False


def search_skill_md_in_repo(owner: str, repo: str, skill_slug: str) -> Optional[str]:
    """Search for SKILL.md in various possible locations within a repo"""
    
    # Try common patterns first (quick checks)
    quick_patterns = [
        f"skills/{skill_slug}/SKILL.md",
        f"{skill_slug}/SKILL.md",
    ]
    
    for pattern in quick_patterns:
        for branch in ["main", "master"]:
            url = f"{GITHUB_RAW_BASE}/{owner}/{repo}/{branch}/{pattern}"
            if check_raw_url_exists(url):
                return url
    
    # Check repo root for structure hints
    root_contents = get_repo_contents(owner, repo)
    if not root_contents:
        return None
    
    # Find directories that might contain skills
    skill_dirs = []
    for item in root_contents:
        if item.get("type") != "dir":
            continue
        name = item.get("name", "")
        if name in ["skills", "plugins", skill_slug]:
            skill_dirs.append(name)
    
    # Check skills/ directory
    if "skills" in skill_dirs:
        skill_contents = get_repo_contents(owner, repo, "skills")
        if skill_contents:
            for item in skill_contents:
                if item.get("type") == "dir" and item.get("name") == skill_slug:
                    for branch in ["main", "master"]:
                        url = f"{GITHUB_RAW_BASE}/{owner}/{repo}/{branch}/skills/{skill_slug}/SKILL.md"
                        if check_raw_url_exists(url):
                            return url
    
    # Check plugins/ directory (expo-style repos)
    if "plugins" in skill_dirs:
        plugins_contents = get_repo_contents(owner, repo, "plugins")
        if plugins_contents:
            for plugin in plugins_contents:
                if plugin.get("type") != "dir":
                    continue
                plugin_name = plugin.get("name", "")
                
                # Check if this plugin contains the skill
                plugin_skills_contents = get_repo_contents(owner, repo, f"plugins/{plugin_name}/skills")
                if plugin_skills_contents:
                    for skill_item in plugin_skills_contents:
                        if skill_item.get("type") == "dir" and skill_item.get("name") == skill_slug:
                            for branch in ["main", "master"]:
                                url = f"{GITHUB_RAW_BASE}/{owner}/{repo}/{branch}/plugins/{plugin_name}/skills/{skill_slug}/SKILL.md"
                                if check_raw_url_exists(url):
                                    return url
    
    # Check if skill_slug matches a root directory
    if skill_slug in skill_dirs:
        for branch in ["main", "master"]:
            url = f"{GITHUB_RAW_BASE}/{owner}/{repo}/{branch}/{skill_slug}/SKILL.md"
            if check_raw_url_exists(url):
                return url
    
    return None


def parse_skill_md(content: str) -> dict:
    """Parse SKILL.md YAML frontmatter and content"""
    result = {
        "name": "",
        "description": "",
        "version": "1.0.0",
        "license": "",
        "keywords": [],
        "author": "",
        "content": content
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
            result["keywords"] = frontmatter.get("keywords", [])
            
            # Handle author in different formats
            author = frontmatter.get("author")
            if isinstance(author, dict):
                result["author"] = author.get("name", "")
            elif author:
                result["author"] = str(author)
            
            # Check metadata for additional fields
            metadata = frontmatter.get("metadata", {})
            if isinstance(metadata, dict):
                if not result["author"] and metadata.get("author"):
                    result["author"] = metadata.get("author")
                if not result["version"] and metadata.get("version"):
                    result["version"] = metadata.get("version")
        
        result["content"] = parts[2].strip()
    except yaml.YAMLError:
        pass
    
    return result


def crawl_all_skills(max_skills: int = None, verbose: bool = True) -> list[Skill]:
    """Main crawling function - fetches all skills from skills.sh"""
    print("=" * 60)
    print("Skills.sh Crawler v2")
    print("=" * 60)
    
    # Step 1: Fetch homepage
    print("\n[1/4] Fetching skills.sh homepage...")
    homepage_html = fetch_page(SKILLS_SH_URL)
    if not homepage_html:
        print("  [ERROR] Failed to fetch homepage")
        return []
    
    # Step 2: Extract skill links
    print("\n[2/4] Extracting skill links...")
    skill_links = extract_skills_from_homepage(homepage_html)
    print(f"  Found {len(skill_links)} unique skill links")
    
    if max_skills:
        skill_links = skill_links[:max_skills]
        print(f"  Limited to first {max_skills} skills")
    
    # Step 3: Fetch each skill's details
    print("\n[3/4] Fetching skill details...")
    skills = []
    skills_with_md = 0
    
    for i, skill_info in enumerate(skill_links, 1):
        owner = skill_info["owner"]
        repo = skill_info["repo"]
        skill_slug = skill_info["skill_slug"]
        
        print(f"  [{i}/{len(skill_links)}] {owner}/{repo}/{skill_slug}")
        
        # Fetch description from skill page on skills.sh
        page_details = fetch_skill_page_details(skill_info["url"])
        description = page_details.get("description", "")
        installs = skill_info["installs"] or page_details.get("installs", 0)
        
        # Search for SKILL.md
        skill_md_url = search_skill_md_in_repo(owner, repo, skill_slug)
        skill_md_content = ""
        parsed_md = {}
        
        if skill_md_url:
            skill_md_content = fetch_raw_url(skill_md_url) or ""
            if skill_md_content:
                parsed_md = parse_skill_md(skill_md_content)
                skills_with_md += 1
                if verbose:
                    print(f"    ✓ Found SKILL.md")
            else:
                if verbose:
                    print(f"    ✗ Failed to fetch SKILL.md content")
        else:
            if verbose:
                print(f"    ✗ Could not locate SKILL.md")
        
        # Use parsed description if not found on page
        if not description and parsed_md.get("description"):
            description = parsed_md["description"]
        if not description:
            description = f"Agent skill from {owner}/{repo}"
        
        # Create skill object
        skill = Skill(
            id=str(uuid.uuid4()),
            name=parsed_md.get("name") or skill_slug.replace("-", " ").title(),
            description=description[:500],  # Limit description length
            owner=owner,
            repo=repo,
            skill_slug=skill_slug,
            version=parsed_md.get("version", "1.0.0"),
            license=parsed_md.get("license", ""),
            github_url=f"https://github.com/{owner}/{repo}",
            skill_md_url=skill_md_url or "",
            skill_md_content=skill_md_content,
            skillssh_rank=i,
            skillssh_installs=installs,
            author=parsed_md.get("author") or owner,
            tags=json.dumps(parsed_md.get("keywords", []))
        )
        
        skills.append(skill)
    
    print(f"\n[4/4] Processing complete!")
    print(f"  Total skills crawled: {len(skills)}")
    print(f"  Skills with SKILL.md: {skills_with_md}")
    print(f"  Success rate: {skills_with_md/len(skills)*100:.1f}%")
    
    return skills


def save_to_json(skills: list[Skill], output_path: str) -> None:
    """Save skills to a JSON file"""
    data = [asdict(s) for s in skills]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(skills)} skills to {output_path}")


def print_summary(skills: list[Skill]) -> None:
    """Print a summary of crawled skills"""
    print("\n" + "=" * 60)
    print("Top 20 Skills by Rank")
    print("=" * 60)
    
    for skill in skills[:20]:
        md_status = "✓" if skill.skill_md_content else "✗"
        print(f"  {skill.skillssh_rank:3d}. [{md_status}] {skill.owner}/{skill.repo}/{skill.skill_slug}")


def main():
    parser = argparse.ArgumentParser(description="Crawl skills.sh and store skills")
    parser.add_argument("--output", "-o", default="skills_sh_data.json",
                       help="Output JSON file path")
    parser.add_argument("--max-skills", "-m", type=int, default=None,
                       help="Maximum number of skills to crawl")
    parser.add_argument("--quiet", "-q", action="store_true",
                       help="Reduce output verbosity")
    
    args = parser.parse_args()
    
    # Crawl skills
    skills = crawl_all_skills(max_skills=args.max_skills, verbose=not args.quiet)
    
    if skills:
        # Save to JSON
        save_to_json(skills, args.output)
        
        # Print summary
        if not args.quiet:
            print_summary(skills)
    else:
        print("\nNo skills were crawled. Please check the errors above.")


if __name__ == "__main__":
    main()
