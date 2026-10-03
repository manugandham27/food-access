from pathlib import Path

code = r'''"""
Hostel Mess Excel -> JSON Converter
===================================

Purpose
-------
Converts a monthly hostel mess Excel workbook into two independent JSON files:

    veg-non-veg.json
    special.json

Expected Excel structure
------------------------
The workbook contains two sheets:

    1. Veg & Non-Veg
    2. Special

Each sheet has a table similar to:

    Day              Breakfast       Lunch       Snacks       Dinner
    -------------------------------------------------------------------
    Tue 1, 15, 29    Item 1          Item 1      Item 1       Item 1
                     Item 2          Item 2      Item 2       Item 2
                     Item 3          Item 3                   Item 3
                     ...

    Wed 2, 16, 30    ...
                     ...

IMPORTANT:
A non-empty value in the first column starts a new menu block.
All rows below it, until the next non-empty first-column value,
belong to that same block.

For example:

    Tue 1, 15, 29
        breakfast rows
        lunch rows
        snack rows
        dinner rows

means that THE ENTIRE BLOCK belongs to all three dates:

    Tue 1
    Tue 15
    Tue 29

The script therefore duplicates the complete menu block for each date.

Output
------
The script creates:

    output/
        mens/
            YEAR/
                MONTH/
                    veg-non-veg.json
                    special.json

Example:

    output/
        mens/
            2026/
                09/
                    veg-non-veg.json
                    special.json

Usage
-----
Command line:

    python convert_menu.py september_2026.xlsx --month 9 --year 2026

Optional hostel:

    python convert_menu.py september_2026.xlsx --month 9 --year 2026 --hostel mens

The hostel value is currently mainly organizational. The converter is
designed so that the same code can later be used for women's hostel data.

Dependencies
------------
Install once:

    pip install pandas openpyxl
"""

import argparse
import json
import re
from collections import OrderedDict
from datetime import date
from pathlib import Path

import pandas as pd


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

EXPECTED_SHEETS = {
    "veg_non_veg": "Veg & Non-Veg",
    "special": "Special",
}

MEAL_NAMES = {
    1: "breakfast",
    2: "lunch",
    3: "snacks",
    4: "dinner",
}


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def clean_cell(value):
    """Convert an Excel cell into a clean string or None."""
    if pd.isna(value):
        return None

    text = str(value)

    # Excel sometimes stores line breaks inside a menu item.
    text = text.replace("\n", " ")

    # Remove repeated whitespace.
    text = re.sub(r"\s+", " ", text).strip()

    return text if text else None


def parse_day_numbers(day_text):
    """
    Extract all day numbers from strings such as:

        Tue 1
        Tue 1, 15, 29
        Wednesday 2, 16, 30

    Returns:
        [1]
        [1, 15, 29]
        [2, 16, 30]
    """
    if not day_text:
        return []

    numbers = re.findall(r"\d+", day_text)

    return [int(number) for number in numbers]


def extract_weekday(day_text):
    """
    Extract the weekday portion.

    Examples:
        'Tue 1, 15, 29' -> 'Tue'
        'Wednesday 2, 16' -> 'Wednesday'
    """
    if not day_text:
        return ""

    match = re.match(r"^\s*([A-Za-z]+)", day_text)

    return match.group(1) if match else ""


def validate_day(month, year, day_number):
    """Check whether the day actually exists in the supplied month/year."""
    try:
        date(year, month, day_number)
        return True
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# Excel processing
# ---------------------------------------------------------------------------

def find_header_row(raw_df):
    """
    Find the row containing the 'Day' header.

    The workbook may have title rows before the actual table.
    """
    for row_index in range(len(raw_df)):
        first_cell = clean_cell(raw_df.iloc[row_index, 0])

        if first_cell and first_cell.lower() == "day":
            return row_index

    raise ValueError(
        "Could not find a 'Day' header in the first column."
    )


def find_date_block_rows(raw_df, header_row):
    """
    Find rows where the first column is non-empty.

    Every such row starts a new menu block.
    """
    block_starts = []

    for row_index in range(header_row + 1, len(raw_df)):
        first_cell = clean_cell(raw_df.iloc[row_index, 0])

        if first_cell:
            block_starts.append(row_index)

    return block_starts


def extract_menu_block(raw_df, start_row, end_row):
    """
    Extract Breakfast/Lunch/Snacks/Dinner from one menu block.

    The number of rows is NOT assumed to be fixed.
    Each meal receives every non-empty cell in its corresponding column.
    """
    meals = OrderedDict()

    for column_index, meal_name in MEAL_NAMES.items():

        # Protect against malformed sheets with fewer than 5 columns.
        if column_index >= raw_df.shape[1]:
            meals[meal_name] = []
            continue

        items = []

        for value in raw_df.iloc[start_row:end_row, column_index].tolist():
            cleaned = clean_cell(value)

            if cleaned:
                items.append(cleaned)

        meals[meal_name] = items

    return meals


def convert_sheet(raw_df, month, year, sheet_name):
    """
    Convert one Excel sheet into a date-keyed menu dictionary.

    Example input block:
        Tue 1, 15, 29

    becomes:
        2026-09-01 -> full menu
        2026-09-15 -> full menu
        2026-09-29 -> full menu
    """
    header_row = find_header_row(raw_df)
    block_starts = find_date_block_rows(raw_df, header_row)

    if not block_starts:
        raise ValueError(
            f"No menu blocks were found in sheet '{sheet_name}'."
        )

    result = OrderedDict()

    for block_index, start_row in enumerate(block_starts):

        # The next date row marks the end of this block.
        if block_index + 1 < len(block_starts):
            end_row = block_starts[block_index + 1]
        else:
            end_row = len(raw_df)

        day_text = clean_cell(raw_df.iloc[start_row, 0])

        day_numbers = parse_day_numbers(day_text)
        weekday = extract_weekday(day_text)

        if not day_numbers:
            print(
                f"WARNING: Could not find a day number in "
                f"'{day_text}' on sheet '{sheet_name}'. Skipping block."
            )
            continue

        # Extract the COMPLETE block once.
        meals = extract_menu_block(
            raw_df,
            start_row,
            end_row,
        )

        # Duplicate the complete menu for every date listed
        # in the first-column marker.
        for day_number in day_numbers:

            if not validate_day(month, year, day_number):
                print(
                    f"WARNING: Invalid date {year}-{month:02d}-{day_number:02d} "
                    f"from '{day_text}' on sheet '{sheet_name}'. Skipping."
                )
                continue

            menu_date = date(
                year,
                month,
                day_number,
            ).isoformat()

            # Copy the meal dictionary so each date is independent.
            result[menu_date] = {
                "day": weekday,
                "meals": {
                    meal: list(items)
                    for meal, items in meals.items()
                },
            }

    return result


# ---------------------------------------------------------------------------
# JSON creation
# ---------------------------------------------------------------------------

def write_json(output_path, hostel, month, year, month_name, mess_type, menus):
    """Write one clean JSON file."""

    data = {
        "hostel": hostel,
        "year": year,
        "month": month,
        "month_name": month_name,
        "mess_type": mess_type,
        "menus": menus,
    }

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    return data


def convert_workbook(
    excel_path,
    month,
    year,
    hostel="mens",
    output_root="output",
):
    """
    Convert the complete workbook.

    Produces two independent JSON files:

        output/mens/YYYY/MM/veg-non-veg.json
        output/mens/YYYY/MM/special.json
    """

    excel_path = Path(excel_path)

    if not excel_path.exists():
        raise FileNotFoundError(
            f"Excel file not found: {excel_path}"
        )

    if not 1 <= month <= 12:
        raise ValueError("Month must be between 1 and 12.")

    if not isinstance(year, int) or year < 1:
        raise ValueError("Year must be a valid positive integer.")

    # Read the workbook without assuming where the header is.
    workbook = pd.ExcelFile(excel_path)

    print("\nAvailable sheets:")
    for sheet in workbook.sheet_names:
        print(f"  - {sheet}")

    # Find the two required sheets.
    normalized_sheet_names = {
        sheet.strip().lower(): sheet
        for sheet in workbook.sheet_names
    }

    required_sheet_map = {}

    for mess_type, expected_name in EXPECTED_SHEETS.items():
        key = expected_name.strip().lower()

        if key not in normalized_sheet_names:
            raise ValueError(
                f"Required sheet '{expected_name}' was not found.\n"
                f"Available sheets: {workbook.sheet_names}"
            )

        required_sheet_map[mess_type] = normalized_sheet_names[key]

    month_name = date(
        year,
        month,
        1,
    ).strftime("%B")

    # Example:
    # output/mens/2026/09/
    output_directory = (
        Path(output_root)
        / hostel
        / str(year)
        / f"{month:02d}"
    )

    print("\n==========================================")
    print("HOSTEL MENU CONVERTER")
    print("==========================================")
    print(f"Excel     : {excel_path}")
    print(f"Hostel    : {hostel}")
    print(f"Month     : {month_name}")
    print(f"Year      : {year}")
    print(f"Output    : {output_directory}")
    print("==========================================\n")

    generated_files = []

    for mess_type, sheet_name in required_sheet_map.items():

        print(f"Processing sheet: {sheet_name}")

        raw_df = pd.read_excel(
            excel_path,
            sheet_name=sheet_name,
            header=None,
        )

        menus = convert_sheet(
            raw_df,
            month,
            year,
            sheet_name,
        )

        if mess_type == "veg_non_veg":
            file_name = "veg-non-veg.json"
        else:
            file_name = "special.json"

        output_path = output_directory / file_name

        write_json(
            output_path=output_path,
            hostel=hostel,
            month=month,
            year=year,
            month_name=month_name,
            mess_type=mess_type,
            menus=menus,
        )

        generated_files.append(output_path)

        print(
            f"  Dates generated: {len(menus)}"
        )
        print(
            f"  JSON created   : {output_path}"
        )

    print("\n==========================================")
    print("CONVERSION COMPLETE")
    print("==========================================")

    for file_path in generated_files:
        print(f"✓ {file_path}")

    print()

    return generated_files


# ---------------------------------------------------------------------------
# Command-line interface
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Convert monthly hostel mess Excel data "
            "into date-based JSON files."
        )
    )

    parser.add_argument(
        "excel_file",
        help="Path to the Excel workbook.",
    )

    parser.add_argument(
        "--month",
        type=int,
        required=True,
        help="Month number. Example: September = 9.",
    )

    parser.add_argument(
        "--year",
        type=int,
        required=True,
        help="Year. Example: 2026.",
    )

    parser.add_argument(
        "--hostel",
        default="mens",
        choices=["mens", "womens"],
        help="Hostel type. Default: mens.",
    )

    parser.add_argument(
        "--output",
        default="output",
        help="Output root directory. Default: output.",
    )

    args = parser.parse_args()

    try:
        convert_workbook(
            excel_path=args.excel_file,
            month=args.month,
            year=args.year,
            hostel=args.hostel,
            output_root=args.output,
        )

    except Exception as error:
        print("\nERROR:")
        print(error)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
'''

file_path = Path("/mnt/data/convert_menu.py")
file_path.write_text(code, encoding="utf-8")

print(f"Created: {file_path}")
