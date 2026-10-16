import os

version_file = os.path.join(os.path.dirname(__file__), 'build.count')
tex_file = os.path.join(os.path.dirname(__file__), 'version.tex')

# Read current version
try:
    with open(version_file, 'r') as f:
        content = f.read().strip()
        # Parse content if it's the old LaTeX format or just a number
        # Old format: \setcounter{buildversion}{14}
        if 'setcounter' in content:
            import re
            match = re.search(r'\{(\d+)\}', content)
            version = int(match.group(1)) if match else 0
        else:
            version = int(content)
except (FileNotFoundError, ValueError):
    version = 0

# Increment version
version += 1

# Write back strictly as number for future simplicity
with open(version_file, 'w') as f:
    f.write(str(version))

# Write TeX file for import
with open(tex_file, 'w') as f:
    f.write(f'\\setcounter{{buildversion}}{{{version}}}')

print(f"Build version updated to {version}")
