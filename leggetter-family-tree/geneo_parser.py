#!/usr/bin/env python3
"""
Centralized Geneo .gen file parser
Parses Geneo binary file format and returns structured people data
"""
import struct

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
    except Exception:
        return None, offset


def parse_gen_file(filename):
    """
    Parse a .gen file and return list of people

    Returns:
        list: List of person dictionaries with keys:
            - id: Person ID
            - first_name: First name
            - last_name: Last name
            - title: Title
            - name_suffix: Name suffix
            - details: Details text
            - life_dates: Life dates string
            - sex: Sex (1=male, 2=female)
            - father: Father's person ID (-1 if none)
            - mother: Mother's person ID (-1 if none)
            - families: List of family IDs
    """
    with open(filename, "rb") as f:
        data = f.read()

    people = []
    current_person = None
    person_number_to_id = {}  # Map PERSON NUMBER to ID
    current_person_number = None
    in_family_context = False
    offset = 0

    while offset < len(data):
        if offset >= len(data):
            break

        record_type = data[offset]
        offset += 1

        if record_type == PERSON:
            if current_person:
                people.append(current_person)

            # PERSON record has a short value (PERSON NUMBER)
            if offset + 2 <= len(data):
                current_person_number = struct.unpack(">H", data[offset : offset + 2])[
                    0
                ]
                offset += 2

            current_person = {
                "id": None,
                "first_name": "",
                "last_name": "",
                "title": "",
                "name_suffix": "",
                "details": "",
                "life_dates": "",
                "sex": 1,
                "father": -1,
                "mother": -1,
                "families": [],
            }
            in_family_context = False

        elif record_type == FAMILY:
            # Entering FAMILY context
            in_family_context = True
            if offset + 2 <= len(data):
                offset += 2

        elif record_type == ID:
            if offset + 2 <= len(data):
                person_id = struct.unpack(">H", data[offset : offset + 2])[0]
                current_person["id"] = person_id
                # Map PERSON NUMBER to ID
                if current_person_number is not None:
                    person_number_to_id[current_person_number] = person_id
                offset += 2

        elif record_type == FIRST_NAME:
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["first_name"] = value

        elif record_type == LAST_NAME:
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["last_name"] = value

        elif record_type == TITLE:
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["title"] = value

        elif record_type == NAME_SUFFIX:
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["name_suffix"] = value

        elif record_type == DETAILS:
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["details"] = value

        elif record_type == LIFE_DATES:
            value, offset = read_utf_string(data, offset)
            if value and current_person:
                current_person["life_dates"] = value

        elif record_type == SEX:
            if offset + 2 <= len(data):
                current_person["sex"] = struct.unpack(">H", data[offset : offset + 2])[
                    0
                ]
                offset += 2

        elif record_type == FATHER:
            if offset + 2 <= len(data):
                father_id = struct.unpack(">H", data[offset : offset + 2])[0]
                # Only assign if NOT in family context
                if not in_family_context and current_person:
                    current_person["father"] = father_id
                offset += 2

        elif record_type == MOTHER:
            if offset + 2 <= len(data):
                mother_id = struct.unpack(">H", data[offset : offset + 2])[0]
                # Only assign if NOT in family context
                if not in_family_context and current_person:
                    current_person["mother"] = mother_id
                offset += 2

        elif record_type == FAMILY_LINK:
            if offset + 2 <= len(data):
                family_id = struct.unpack(">H", data[offset : offset + 2])[0]
                if current_person:
                    current_person["families"].append(family_id)
                offset += 2

        elif record_type in [VERSION, PEOPLE_COUNT, FAMILY_COUNT, CHILD, ALIVE]:
            if offset + 2 <= len(data):
                offset += 2

        elif record_type in [PASSWORD, MPASSWORD]:
            value, offset = read_utf_string(data, offset)

        else:
            # Unknown record type
            break

    if current_person:
        people.append(current_person)

    # Post-process: Convert FATHER/MOTHER from person numbers to IDs
    for person in people:
        if person["father"] != -1:
            person["father"] = person_number_to_id.get(
                person["father"], person["father"]
            )
        if person["mother"] != -1:
            person["mother"] = person_number_to_id.get(
                person["mother"], person["mother"]
            )

    return people
