#!/usr/bin/env python3
"""
Parse Geneo .gen file format based on the official Java source code
File format uses record types as defined in GenFile.java
"""
import struct
import sys

# Record types from GenFile.java
VERSION = 0
PEOPLE_COUNT = 1
FAMILY_COUNT = 2
PERSON = 3
ID = 4
FIRST_NAME = 5
LAST_NAME = 6
TITLE = 7
NAME_SUFFIX = 8
DETAILS = 9
LIFE_DATES = 10
SEX = 11
FATHER = 12
MOTHER = 13
FAMILY_LINK = 14
FAMILY = 15
CHILD = 16
ALIVE = 17
PASSWORD = 18
MPASSWORD = 19

record_names = {
    0: "VERSION",
    1: "PEOPLE_COUNT",
    2: "FAMILY_COUNT",
    3: "PERSON",
    4: "ID",
    5: "FIRST_NAME",
    6: "LAST_NAME",
    7: "TITLE",
    8: "NAME_SUFFIX",
    9: "DETAILS",
    10: "LIFE_DATES",
    11: "SEX",
    12: "FATHER",
    13: "MOTHER",
    14: "FAMILY_LINK",
    15: "FAMILY",
    16: "CHILD",
    17: "ALIVE",
    18: "PASSWORD",
    19: "MPASSWORD",
}


def read_utf_string(data, offset):
    """Read a Java UTF string (2-byte length prefix + UTF-8 data)"""
    if offset + 2 > len(data):
        return None, offset

    length = struct.unpack(">H", data[offset : offset + 2])[0]
    offset += 2

    if offset + length > len(data):
        return None, offset

    try:
        string_data = data[offset : offset + length].decode("utf-8")
        offset += length
        return string_data, offset
    except:
        return None, offset


def parse_gen_file(filename):
    """Parse a .gen file and return list of people"""
    with open(filename, "rb") as f:
        data = f.read()

    people = []
    current_person = None
    offset = 0

    while offset < len(data):
        # Read record type (1 byte)
        if offset >= len(data):
            break

        record_type = data[offset]
        offset += 1

        if record_type == PERSON:
            # Start of a new person record
            if current_person:
                people.append(current_person)
            current_person = {
                "id": None,
                "first_name": "",
                "last_name": "",
                "title": "",
                "name_suffix": "",
                "details": "",
                "life_dates": "",
                "sex": 1,  # male by default
                "father": -1,
                "mother": -1,
                "families": [],
            }
            # PERSON record has a short value (2 bytes) - skip it
            if offset + 2 <= len(data):
                offset += 2

        elif record_type == ID:
            # Read short integer
            if offset + 2 <= len(data):
                current_person["id"] = struct.unpack(">H", data[offset : offset + 2])[0]
                offset += 2

        elif record_type == FIRST_NAME:
            # Read UTF string
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["first_name"] = value

        elif record_type == LAST_NAME:
            # Read UTF string
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["last_name"] = value

        elif record_type == TITLE:
            # Read UTF string
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["title"] = value

        elif record_type == NAME_SUFFIX:
            # Read UTF string
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["name_suffix"] = value

        elif record_type == DETAILS:
            # Read UTF string
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["details"] = value

        elif record_type == LIFE_DATES:
            # Read UTF string
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["life_dates"] = value

        elif record_type == SEX:
            # Read short integer
            if offset + 2 <= len(data):
                current_person["sex"] = struct.unpack(">H", data[offset : offset + 2])[
                    0
                ]
                offset += 2

        elif record_type == FATHER:
            # Read short integer
            if offset + 2 <= len(data):
                current_person["father"] = struct.unpack(
                    ">H", data[offset : offset + 2]
                )[0]
                offset += 2

        elif record_type == MOTHER:
            # Read short integer
            if offset + 2 <= len(data):
                current_person["mother"] = struct.unpack(
                    ">H", data[offset : offset + 2]
                )[0]
                offset += 2

        elif record_type == FAMILY_LINK:
            # Read short integer - family index
            if offset + 2 <= len(data):
                family_id = struct.unpack(">H", data[offset : offset + 2])[0]
                if current_person:
                    current_person["families"].append(family_id)
                offset += 2

        elif record_type in [VERSION, PEOPLE_COUNT, FAMILY_COUNT, FAMILY, CHILD, ALIVE]:
            # These have short integer values
            if offset + 2 <= len(data):
                offset += 2

        elif record_type in [PASSWORD, MPASSWORD]:
            # These have UTF string values
            value, offset = read_utf_string(data, offset)

        else:
            # Unknown record type - try to skip
            print(
                f"Warning: Unknown record type {record_type} at offset {offset-1}",
                file=sys.stderr,
            )
            break

    # Add the last person
    if current_person:
        people.append(current_person)

    return people


# Parse the file
if len(sys.argv) < 2:
    print("Usage: python parser.py <input.gen>")
    sys.exit(1)

input_file = sys.argv[1]
people = parse_gen_file(input_file)

print(f"Found {len(people)} people in the genealogy file")

# Filter out invalid entries and create clean records
clean_people = []
for person in people:
    # Must have at least first or last name
    if person["first_name"] or person["last_name"]:
        full_name = f"{person['first_name']} {person['last_name']}".strip()

        # Parse details to extract birth, death, marriage info
        details = person.get("details", "")
        birth = ""
        death = ""
        marriages = []

        if details:
            for line in details.split("\n"):
                line = line.strip()
                if line.startswith("Birth:"):
                    birth = line.replace("Birth:", "").strip()
                elif line.startswith("Death:"):
                    death = line.replace("Death:", "").strip()
                elif line.startswith("Marriage:"):
                    marriages.append(line.replace("Marriage:", "").strip())

        clean_people.append(
            {
                "id": person["id"],
                "first_name": person["first_name"],
                "last_name": person["last_name"],
                "full_name": full_name,
                "title": person.get("title", ""),
                "name_suffix": person.get("name_suffix", ""),
                "birth": birth,
                "death": death,
                "life_dates": person.get("life_dates", ""),
                "marriages": marriages,
                "sex": person["sex"],
                "father_id": person["father"],
                "mother_id": person["mother"],
            }
        )

people = clean_people

print(f"After filtering: {len(people)} valid people")

# Check for Philip Robert Leggetter
philip_found = [
    p
    for p in people
    if "philip" in p["full_name"].lower()
    and "robert" in p["full_name"].lower()
    and "leggetter" in p["full_name"].lower()
]
if philip_found:
    print(f"\n✓ Found Philip Robert Leggetter!")
    for p in philip_found:
        print(f"  {p['full_name']} (ID: {p['id']})")
        if p["birth"]:
            print(f"    Born: {p['birth']}")
        if p["life_dates"]:
            print(f"    Life dates: {p['life_dates']}")
else:
    print(f"\n✗ Philip Robert Leggetter not found")
    # Show other Philips
    philips = [p for p in people if "philip" in p["full_name"].lower()]
    if philips:
        print(f"  Found {len(philips)} other Philip(s):")
        for p in philips:
            print(f"    - {p['full_name']}")

# Generate HTML
html = (
    """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leggetter Family Tree</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-style: italic;
        }
        .search-box {
            margin: 20px 0;
            text-align: center;
        }
        .search-box input {
            padding: 10px 20px;
            width: 300px;
            border: 2px solid #667eea;
            border-radius: 25px;
            font-size: 16px;
        }
        .person-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .person-card:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .person-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
        }
        .person-id {
            color: #999;
            font-size: 0.85em;
            font-family: monospace;
        }
        .person-dates {
            color: #555;
            margin: 5px 0;
            font-size: 0.95em;
        }
        .person-marriages {
            color: #666;
            margin: 8px 0;
            padding-left: 20px;
        }
        .marriage-item {
            margin: 3px 0;
            padding: 5px;
            background: rgba(255,255,255,0.5);
            border-radius: 4px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            color: white;
        }
        .stat-item {
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .hidden {
            display: none;
        }
        .highlight {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border-left-color: #ffa502;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌳 Leggetter Family Tree</h1>
        <div class="subtitle">Complete Genealogical Records - Parsed from Geneo Format</div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number" id="totalPeople">"""
    + str(len(people))
    + """</div>
                <div class="stat-label">People</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" id="totalMarriages">"""
    + str(sum(len(p["marriages"]) for p in people))
    + """</div>
                <div class="stat-label">Marriages</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">"""
    + str(len([p for p in people if p["birth"]]))
    + """</div>
                <div class="stat-label">Birth Records</div>
            </div>
        </div>
        
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search by name..." onkeyup="filterPeople()">
        </div>
        
        <div id="peopleList">
"""
)

# Sort people by last name, then first name
people.sort(key=lambda p: (p["last_name"], p["first_name"]))

for person in people:
    # Highlight Philip Robert Leggetter
    card_class = "person-card"
    if (
        "philip" in person["full_name"].lower()
        and "robert" in person["full_name"].lower()
    ):
        card_class = "person-card highlight"

    html += f"""
            <div class="{card_class}" data-name="{person['full_name'].lower()}">
                <div class="person-name">{person['full_name']}</div>
                <div class="person-id">ID: {person['id']}</div>
"""

    if person["birth"] or person["death"] or person["life_dates"]:
        dates = []
        if person["birth"]:
            dates.append(f"Born: {person['birth']}")
        if person["death"]:
            dates.append(f"Died: {person['death']}")
        if person["life_dates"] and not person["birth"] and not person["death"]:
            dates.append(person["life_dates"])
        html += f"""                <div class="person-dates">{'  •  '.join(dates)}</div>\n"""

    if person["marriages"]:
        html += """                <div class="person-marriages">\n"""
        html += """                    <strong>Marriages:</strong>\n"""
        for marriage in person["marriages"]:
            html += f"""                    <div class="marriage-item">💍 {marriage}</div>\n"""
        html += """                </div>\n"""

    html += """            </div>\n"""

html += """
        </div>
    </div>
    
    <script>
        function filterPeople() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const cards = document.querySelectorAll('.person-card');
            
            cards.forEach(card => {
                const name = card.getAttribute('data-name');
                if (name.includes(searchTerm)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        }
        
        // Scroll to highlighted card on load
        window.addEventListener('load', function() {
            const highlighted = document.querySelector('.highlight');
            if (highlighted) {
                highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    </script>
</body>
</html>
"""

# Write file
with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nGenerated family tree HTML")
print(f"\nStatistics:")
print(f"  Total people: {len(people)}")
print(f"  With birth dates: {len([p for p in people if p['birth']])}")
print(f"  With death dates: {len([p for p in people if p['death']])}")
print(f"  With life dates: {len([p for p in people if p['life_dates']])}")
print(f"  Total marriages: {sum(len(p['marriages']) for p in people)}")

# Show some Leggetter samples
print(f"\nSample Leggetter entries:")
leggetters = [p for p in people if "leggetter" in p["last_name"].lower()][:10]
for person in leggetters:
    print(f"  {person['full_name']} (ID: {person['id']})")
    if person["birth"]:
        print(f"    Born: {person['birth']}")
    if person["life_dates"]:
        print(f"    {person['life_dates']}")
