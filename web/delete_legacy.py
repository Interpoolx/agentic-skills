import os

files_to_delete = [
    r"d:\react-projects\agentic-skills\web\src\routes\$owner.index.tsx",
    r"d:\react-projects\agentic-skills\web\src\routes\$owner.$repo.index.tsx",
    r"d:\react-projects\agentic-skills\web\src\routes\$owner.$repo.$skillSlug.tsx",
    r"d:\react-projects\agentic-skills\web\src\routes\skill.$skillId.tsx"
]

for f in files_to_delete:
    try:
        if os.path.exists(f):
            os.remove(f)
            print(f"Deleted: {f}")
        else:
            print(f"Not found: {f}")
    except Exception as e:
        print(f"Error deleting {f}: {e}")
