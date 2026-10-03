"""
Hostel Mess Excel -> JSON Converter
===================================

Converts a monthly hostel mess Excel workbook into two JSON files.

Input:
    october_2026.xlsx

Output:
    output/
        mens/
            2026/
                10/
                    october_2026_veg-non-veg.json
                    october_2026_special.json

Expected Excel sheets:
    1. Veg & Non-Veg
    2. Special

Important:
    If the Day column contains:

        Tue 1, 15, 29

    the COMPLETE menu block is assigned to:

        2026-10-01
        2026-10-15
        2026-10-29

The number of rows for a meal is not fixed.
"""

import argparse
import json
import re
from collections import OrderedDict
from datetime import date
from pathlib import Path

import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

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


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def clean_cell(value):
    """
    Convert an Excel cell into a clean string.

    Empty cells become None.
    """

    if pd.isna(value):
        return None

    text = str(value)

    # Remove line breaks
    text = text.replace("\n", " ")

    # Remove repeated spaces
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return None

    return text


def parse_day_numbers(day_text):
    """
    Extract all day numbers from strings such as:

        Tue 1
        Tue 1, 15, 29
        Wednesday 2, 16, 30

    Examples:

        Tue 1
        -> [1]

        Tue 1, 15, 29
        -> [1, 15, 29]
    """

    if not day_text:
        return []

    numbers = re.findall(r"\d+", day_text)

    return [int(number) for number in numbers]


def extract_weekday(day_text):
    """
    Extract weekday from:

        Tue 1, 15, 29

    Result:

        Tue
    """

    if not day_text:
        return ""

    match = re.match(r"^\s*([A-Za-z]+)", day_text)

    if match:
        return match.group(1)

    return ""


def validate_day(month, year, day_number):
    """
    Check whether a day actually exists in the given month/year.
    """

    try:
        date(year, month, day_number)
        return True

    except ValueError:
        return False


# ============================================================
# FIND EXCEL HEADER
# ============================================================

def find_header_row(raw_df):
    """
    Find the row containing the 'Day' header.

    This allows the Excel file to have title rows
    before the actual table.
    """

    for row_index in range(len(raw_df)):

        first_cell = clean_cell(
            raw_df.iloc[row_index, 0]
        )

        if first_cell and first_cell.lower() == "day":
            return row_index

    raise ValueError(
        "Could not find a 'Day' header in the first column."
    )


# ============================================================
# FIND MENU BLOCKS
# ============================================================

def find_date_block_rows(raw_df, header_row):
    """
    Find rows where the first column is non-empty.

    Every non-empty first-column value starts
    a new menu block.
    """

    block_starts = []

    for row_index in range(
        header_row + 1,
        len(raw_df)
    ):

        first_cell = clean_cell(
            raw_df.iloc[row_index, 0]
        )

        if first_cell:
            block_starts.append(row_index)

    return block_starts


# ============================================================
# EXTRACT ONE MENU BLOCK
# ============================================================

def extract_menu_block(
    raw_df,
    start_row,
    end_row
):
    """
    Extract:

        Breakfast
        Lunch
        Snacks
        Dinner

    from one complete menu block.

    The number of rows is NOT fixed.
    """

    meals = OrderedDict()

    for column_index, meal_name in MEAL_NAMES.items():

        # Protect against Excel files
        # having fewer columns than expected.
        if column_index >= raw_df.shape[1]:

            meals[meal_name] = []

            continue

        items = []

        values = raw_df.iloc[
            start_row:end_row,
            column_index
        ].tolist()

        for value in values:

            cleaned = clean_cell(value)

            if cleaned:
                items.append(cleaned)

        meals[meal_name] = items

    return meals


# ============================================================
# CONVERT ONE EXCEL SHEET
# ============================================================

def convert_sheet(
    raw_df,
    month,
    year,
    sheet_name
):
    """
    Convert one sheet into:

        date -> menu

    Example:

        Tue 1, 15, 29

    becomes:

        2026-10-01
        2026-10-15
        2026-10-29

    with the SAME complete menu block.
    """

    header_row = find_header_row(raw_df)

    block_starts = find_date_block_rows(
        raw_df,
        header_row
    )

    if not block_starts:

        raise ValueError(
            f"No menu blocks were found "
            f"in sheet '{sheet_name}'."
        )

    result = OrderedDict()

    # Process every menu block
    for block_index, start_row in enumerate(
        block_starts
    ):

        # The next date row marks
        # the end of this block.
        if block_index + 1 < len(block_starts):

            end_row = block_starts[
                block_index + 1
            ]

        else:

            end_row = len(raw_df)

        # Get Day value
        day_text = clean_cell(
            raw_df.iloc[start_row, 0]
        )

        # Example:
        # Tue 1, 15, 29
        day_numbers = parse_day_numbers(
            day_text
        )

        # Example:
        # Tue
        weekday = extract_weekday(
            day_text
        )

        if not day_numbers:

            print(
                f"WARNING: Could not find "
                f"a day number in '{day_text}'. "
                f"Skipping block."
            )

            continue

        # ----------------------------------------------------
        # Extract COMPLETE menu block
        # ----------------------------------------------------

        meals = extract_menu_block(
            raw_df,
            start_row,
            end_row
        )

        # ----------------------------------------------------
        # Assign complete menu to every date
        # ----------------------------------------------------

        for day_number in day_numbers:

            # Check date validity
            if not validate_day(
                month,
                year,
                day_number
            ):

                print(
                    f"WARNING: Invalid date "
                    f"{year}-{month:02d}-{day_number:02d} "
                    f"from '{day_text}'. "
                    f"Skipping."
                )

                continue

            menu_date = date(
                year,
                month,
                day_number
            ).isoformat()

            # Create independent copies
            # of the meal arrays.
            result[menu_date] = {

                "day": weekday,

                "meals": {

                    meal: list(items)

                    for meal, items
                    in meals.items()

                }
            }

    return result


# ============================================================
# WRITE JSON
# ============================================================

def write_json(
    output_path,
    hostel,
    month,
    year,
    month_name,
    mess_type,
    menus
):
    """
    Write menu data to JSON.
    """

    data = {

        "hostel": hostel,

        "year": year,

        "month": month,

        "month_name": month_name,

        "mess_type": mess_type,

        "menus": menus
    }

    # Make sure directory exists
    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    # Write JSON
    with output_path.open(
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2
        )

    return data


# ============================================================
# CONVERT COMPLETE WORKBOOK
# ============================================================

def convert_workbook(
    excel_path,
    month,
    year,
    hostel="mens",
    output_root="output"
):
    """
    Convert the complete Excel workbook.

    Example input:

        october_2026.xlsx

    Example output:

        output/
            mens/
                2026/
                    10/
                        october_2026_veg-non-veg.json
                        october_2026_special.json
    """

    # --------------------------------------------------------
    # Convert to Path
    # --------------------------------------------------------

    excel_path = Path(excel_path)

    # --------------------------------------------------------
    # Check Excel file
    # --------------------------------------------------------

    if not excel_path.exists():

        raise FileNotFoundError(
            f"Excel file not found: {excel_path}"
        )

    # --------------------------------------------------------
    # Validate month
    # --------------------------------------------------------

    if not 1 <= month <= 12:

        raise ValueError(
            "Month must be between 1 and 12."
        )

    # --------------------------------------------------------
    # Validate year
    # --------------------------------------------------------

    if not isinstance(year, int) or year < 1:

        raise ValueError(
            "Year must be a valid positive integer."
        )

    # --------------------------------------------------------
    # Excel filename
    # --------------------------------------------------------

    # IMPORTANT:
    #
    # october_2026.xlsx
    #
    # becomes:
    #
    # october_2026
    #
    # This will be used for JSON filenames.
    #
    excel_base_name = excel_path.stem

    # --------------------------------------------------------
    # Read workbook
    # --------------------------------------------------------

    workbook = pd.ExcelFile(
        excel_path
    )

    print()
    print("Available sheets:")

    for sheet in workbook.sheet_names:

        print(f"  - {sheet}")

    # --------------------------------------------------------
    # Normalize sheet names
    # --------------------------------------------------------

    normalized_sheet_names = {

        sheet.strip().lower(): sheet

        for sheet
        in workbook.sheet_names

    }

    # --------------------------------------------------------
    # Find required sheets
    # --------------------------------------------------------

    required_sheet_map = {}

    for mess_type, expected_name in (
        EXPECTED_SHEETS.items()
    ):

        key = expected_name.strip().lower()

        if key not in normalized_sheet_names:

            raise ValueError(
                f"\nRequired sheet "
                f"'{expected_name}' "
                f"was not found.\n\n"
                f"Available sheets:\n"
                f"{workbook.sheet_names}"
            )

        required_sheet_map[mess_type] = (
            normalized_sheet_names[key]
        )

    # --------------------------------------------------------
    # Get month name
    # --------------------------------------------------------

    month_name = date(
        year,
        month,
        1
    ).strftime("%B")

    # --------------------------------------------------------
    # Output directory
    # --------------------------------------------------------

    output_directory = (

        Path(output_root)

        / hostel

        / str(year)

        / f"{month:02d}"

    )

    # --------------------------------------------------------
    # Display information
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("HOSTEL MENU CONVERTER")
    print("=" * 60)

    print(f"Excel      : {excel_path}")
    print(f"File name  : {excel_base_name}")
    print(f"Hostel     : {hostel}")
    print(f"Month      : {month_name}")
    print(f"Year       : {year}")
    print(f"Output     : {output_directory}")

    print("=" * 60)
    print()

    generated_files = []

    # ========================================================
    # PROCESS BOTH SHEETS
    # ========================================================

    for mess_type, sheet_name in (
        required_sheet_map.items()
    ):

        print(
            f"Processing sheet: {sheet_name}"
        )

        # ----------------------------------------------------
        # Read Excel sheet
        # ----------------------------------------------------

        raw_df = pd.read_excel(
            excel_path,
            sheet_name=sheet_name,
            header=None
        )

        # ----------------------------------------------------
        # Convert sheet
        # ----------------------------------------------------

        menus = convert_sheet(
            raw_df,
            month,
            year,
            sheet_name
        )

        # ----------------------------------------------------
        # CREATE FILENAME
        # ----------------------------------------------------
        #
        # october_2026.xlsx
        #
        # becomes:
        #
        # october_2026_veg-non-veg.json
        # october_2026_special.json
        #
        # ----------------------------------------------------

        if mess_type == "veg_non_veg":

            file_name = (
                f"{excel_base_name}"
                f"_veg-non-veg.json"
            )

        else:

            file_name = (
                f"{excel_base_name}"
                f"_special.json"
            )

        # ----------------------------------------------------
        # Final output path
        # ----------------------------------------------------

        output_path = (
            output_directory
            / file_name
        )

        # ----------------------------------------------------
        # Write JSON
        # ----------------------------------------------------

        write_json(
            output_path=output_path,

            hostel=hostel,

            month=month,

            year=year,

            month_name=month_name,

            mess_type=mess_type,

            menus=menus
        )

        generated_files.append(
            output_path
        )

        print(
            f"  Dates generated: {len(menus)}"
        )

        print(
            f"  JSON created   : "
            f"{output_path}"
        )

        print()

    # ========================================================
    # COMPLETE
    # ========================================================

    print("=" * 60)
    print("CONVERSION COMPLETE")
    print("=" * 60)

    print()

    for file_path in generated_files:

        print(
            f"SUCCESS: {file_path}"
        )

    print()

    return generated_files


# ============================================================
# COMMAND LINE
# ============================================================

def main():

    parser = argparse.ArgumentParser(

        description=(
            "Convert monthly hostel "
            "mess Excel data into JSON."
        )
    )

    # --------------------------------------------------------
    # Excel file
    # --------------------------------------------------------

    parser.add_argument(

        "excel_file",

        help=(
            "Path to the Excel workbook."
        )
    )

    # --------------------------------------------------------
    # Month
    # --------------------------------------------------------

    parser.add_argument(

        "--month",

        type=int,

        required=True,

        help=(
            "Month number. "
            "Example: October = 10."
        )
    )

    # --------------------------------------------------------
    # Year
    # --------------------------------------------------------

    parser.add_argument(

        "--year",

        type=int,

        required=True,

        help=(
            "Year. Example: 2026."
        )
    )

    # --------------------------------------------------------
    # Hostel
    # --------------------------------------------------------

    parser.add_argument(

        "--hostel",

        default="mens",

        choices=[
            "mens",
            "womens"
        ],

        help=(
            "Hostel type. "
            "Default: mens."
        )
    )

    # --------------------------------------------------------
    # Output directory
    # --------------------------------------------------------

    parser.add_argument(

        "--output",

        default="output",

        help=(
            "Output root directory. "
            "Default: output."
        )
    )

    # --------------------------------------------------------
    # Parse arguments
    # --------------------------------------------------------

    args = parser.parse_args()

    # --------------------------------------------------------
    # Run converter
    # --------------------------------------------------------

    try:

        convert_workbook(

            excel_path=args.excel_file,

            month=args.month,

            year=args.year,

            hostel=args.hostel,

            output_root=args.output
        )

    except Exception as error:

        print()
        print("=" * 60)
        print("ERROR")
        print("=" * 60)

        print(error)

        print()

        raise SystemExit(1)


# ============================================================
# PROGRAM ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()