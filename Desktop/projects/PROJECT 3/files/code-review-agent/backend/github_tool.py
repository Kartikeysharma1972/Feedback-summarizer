import os
import re
from github import Github, GithubException

SUPPORTED_EXTENSIONS = {'.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.java', '.rb', '.php', '.cpp', '.c', '.rs'}
MAX_FILE_SIZE = 50000  # bytes
MAX_FILES = 20
MAX_TOTAL_CHARS = 50000


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract owner and repo name from GitHub URL."""
    url = url.strip().rstrip('/')
    
    # Match patterns like github.com/owner/repo or github.com/owner/repo/tree/branch
    patterns = [
        r'github\.com[/:]([^/]+)/([^/\s?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            owner = match.group(1)
            repo = match.group(2).replace('.git', '')
            return owner, repo
    
    raise ValueError(f"Could not parse GitHub URL: {url}")


def fetch_github_code(url: str) -> str:
    """Fetch code from a GitHub repository."""
    github_token = os.getenv("GITHUB_TOKEN")
    g = Github(github_token) if github_token else Github()
    
    owner, repo_name = parse_github_url(url)
    
    try:
        repo = g.get_repo(f"{owner}/{repo_name}")
    except GithubException as e:
        if e.status == 403:
            raise ValueError(f"GitHub API rate limit exceeded. Please set a GITHUB_TOKEN in your .env file or try again later.")
        raise ValueError(f"Could not access repository '{owner}/{repo_name}': {str(e)}")
    
    # Collect files
    collected_files = []
    total_chars = 0
    
    def collect_files(contents, depth=0):
        nonlocal total_chars
        if depth > 5 or len(collected_files) >= MAX_FILES:
            return
        
        for content_file in contents:
            if len(collected_files) >= MAX_FILES or total_chars >= MAX_TOTAL_CHARS:
                break
                
            if content_file.type == "dir":
                # Skip common non-code dirs
                skip_dirs = {'node_modules', '.git', '__pycache__', 'dist', 'build', '.next', 'venv', '.venv'}
                if content_file.name not in skip_dirs:
                    try:
                        sub_contents = repo.get_contents(content_file.path)
                        collect_files(sub_contents, depth + 1)
                    except GithubException:
                        pass
            elif content_file.type == "file":
                ext = '.' + content_file.name.rsplit('.', 1)[-1] if '.' in content_file.name else ''
                if ext in SUPPORTED_EXTENSIONS and content_file.size <= MAX_FILE_SIZE:
                    try:
                        file_content = content_file.decoded_content.decode('utf-8', errors='replace')
                        if total_chars + len(file_content) <= MAX_TOTAL_CHARS:
                            collected_files.append({
                                'path': content_file.path,
                                'content': file_content
                            })
                            total_chars += len(file_content)
                    except Exception:
                        pass
    
    try:
        root_contents = repo.get_contents("")
        collect_files(root_contents)
    except GithubException as e:
        raise ValueError(f"Could not fetch repository contents: {str(e)}")
    
    if not collected_files:
        raise ValueError("No supported code files found in repository")
    
    # Build structured context
    result_parts = [
        f"# Repository: {owner}/{repo_name}",
        f"# Files analyzed: {len(collected_files)}",
        f"# Description: {repo.description or 'No description'}",
        ""
    ]
    
    for file_info in collected_files:
        result_parts.append(f"\n{'='*60}")
        result_parts.append(f"FILE: {file_info['path']}")
        result_parts.append('='*60)
        result_parts.append(file_info['content'])
    
    return '\n'.join(result_parts)
