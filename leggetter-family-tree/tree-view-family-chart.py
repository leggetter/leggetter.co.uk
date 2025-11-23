#!/usr/bin/env python3
"""
Generate family tree HTML using family-chart library
Uses separate template files for better maintainability
"""
import json
import sys
import os
from datetime import datetime
from geneo_parser import parse_gen_file

# Parse the file
if len(sys.argv) < 2:
    print("Usage: python tree-view-family-chart.py <input.gen>", file=sys.stderr)
    sys.exit(1)

input_file = sys.argv[1]
people = parse_gen_file(input_file)

print(f"Found {len(people)} people in the genealogy file", file=sys.stderr)

# Build family-chart compatible data structure
nodes_dict = {}

for person in people:
    # Build name
    full_name = f"{person['first_name']} {person['last_name']}".strip()

    # Parse details for birth/death
    details = person.get("details", "")
    birth = ""
    death = ""

    if details:
        for line in details.split("\n"):
            line = line.strip()
            if line.startswith("Birth:"):
                birth = line.replace("Birth:", "").strip()
            elif line.startswith("Death:"):
                death = line.replace("Death:", "").strip()

    # Build relationships object
    rels = {}

    # Add parents
    parents = []
    if person["father"] != -1:
        parents.append(str(person["father"]))
    if person["mother"] != -1:
        parents.append(str(person["mother"]))

    if parents:
        rels["parents"] = parents

    # Create node
    node = {
        "id": str(person["id"]),
        "rels": rels,
        "data": {
            "first name": person["first_name"],
            "last name": person["last_name"],
            "birthday": birth,
            "death": death,
            "gender": "M" if person["sex"] == 1 else "F",
        },
    }

    nodes_dict[str(person["id"])] = node

# Second pass: Add children and spouse relationships
# Build family groups to determine spouses
family_groups = {}  # family_id -> {father: id, mother: id, children: [ids]}

for person in people:
    person_id = str(person["id"])

    # Track families this person is part of (as parent)
    for family_idx in person.get("families", []):
        if family_idx not in family_groups:
            family_groups[family_idx] = {"father": None, "mother": None, "children": []}

        # Determine if this person is father or mother in this family
        if person["sex"] == 1:  # Male
            family_groups[family_idx]["father"] = person_id
        else:  # Female
            family_groups[family_idx]["mother"] = person_id

# Add children to family groups
for person in people:
    person_id = str(person["id"])
    father_id = person["father"]
    mother_id = person["mother"]

    # Find the family this person belongs to (as a child)
    for family_idx, family in family_groups.items():
        if family.get("father") == str(father_id) or family.get("mother") == str(
            mother_id
        ):
            family["children"].append(person_id)
            break

# Now add relationships based on family groups
for person in people:
    person_id = str(person["id"])

    # Add spouses based on family groups
    spouses = []
    for family in family_groups.values():
        if family["father"] == person_id and family["mother"]:
            spouses.append(family["mother"])
        elif family["mother"] == person_id and family["father"]:
            spouses.append(family["father"])

    if spouses:
        nodes_dict[person_id]["rels"]["spouses"] = spouses

    # Add children
    children = []
    for other in people:
        if other["father"] == person["id"] or other["mother"] == person["id"]:
            children.append(str(other["id"]))

    if children:
        nodes_dict[person_id]["rels"]["children"] = children

nodes = list(nodes_dict.values())

print(f"After filtering: {len(nodes)} valid people", file=sys.stderr)


# Sort nodes to put the earliest person first (for initial tree view)
def parse_year(date_str):
    """Extract year from date string, return a large number if no valid year"""
    if not date_str:
        return 9999
    # Try to extract 4-digit year from various formats
    import re

    match = re.search(r"\b(\d{4})\b", date_str)
    if match:
        return int(match.group(1))
    return 9999


# Sort by birth year (earliest first)
nodes.sort(key=lambda n: parse_year(n["data"].get("birthday", "")))

earliest = nodes[0] if nodes else None
if earliest:
    birth = earliest["data"].get("birthday", "unknown")
    name = f"{earliest['data'].get('first name', '')} {earliest['data'].get('last name', '')}"
    print(f"Earliest person: {name.strip()} (born: {birth})", file=sys.stderr)

# Convert to JSON
tree_json = json.dumps(nodes, indent=2)

# Generate version timestamp
version_timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")

# Get script directory for template files
script_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(script_dir, "templates")

# Determine which template to use based on command line argument
use_jekyll = len(sys.argv) > 2 and sys.argv[2] == "--jekyll"
output_to_jekyll = len(sys.argv) > 2 and sys.argv[2] == "--output-jekyll"

# Read template files
if use_jekyll or output_to_jekyll:
    template_file = "family-chart-jekyll.html"
else:
    template_file = "family-chart.html"

with open(os.path.join(template_dir, template_file), "r") as f:
    html_template = f.read()

with open(os.path.join(template_dir, "family-chart.css"), "r") as f:
    css_content = f.read()

with open(os.path.join(template_dir, "family-chart.js"), "r") as f:
    js_template = f.read()

# Replace placeholders in JavaScript
js_content = js_template.replace("{{VERSION}}", version_timestamp)
js_content = js_content.replace("{{DATA}}", tree_json)

# Replace placeholders in HTML
html = html_template.replace("{{CSS}}", css_content)
html = html.replace("{{SCRIPT}}", js_content)
html = html.replace("{{COUNT}}", str(len(nodes)))
html = html.replace("{{VERSION}}", version_timestamp)

# If --output-jekyll flag is used, update the Jekyll markdown file
if output_to_jekyll:
    jekyll_page_path = os.path.join(
        os.path.dirname(script_dir), "pages", "leggetter-family-tree-view.markdown"
    )

    # Read the existing markdown file
    with open(jekyll_page_path, "r") as f:
        markdown_content = f.read()

    # Find the placeholder comments
    begin_marker = "<!-- BEGIN GENERATED FAMILY TREE CONTENT -->"
    end_marker = "<!-- END GENERATED FAMILY TREE CONTENT -->"

    begin_index = markdown_content.find(begin_marker)
    end_index = markdown_content.find(end_marker)

    if begin_index == -1 or end_index == -1:
        print(
            "Error: Could not find placeholder markers in Jekyll page", file=sys.stderr
        )
        sys.exit(1)

    # Calculate where to insert content (after the begin marker and its newline)
    insert_start = begin_index + len(begin_marker)
    # Find the newline after the begin marker
    while (
        insert_start < len(markdown_content) and markdown_content[insert_start] == "\n"
    ):
        insert_start += 1

    # Build the new content with the generated HTML between the markers
    new_content = (
        markdown_content[:insert_start]
        + "\n"
        + html
        + "\n"
        + markdown_content[end_index:]
    )

    # Write back to the file
    with open(jekyll_page_path, "w") as f:
        f.write(new_content)

    print(f"Successfully updated {jekyll_page_path}")
    print(f"Generated content: {len(html)} characters")
    print(f"Total people in tree: {len(nodes)}")
else:
    # Original behavior: print to stdout
    print(html)
