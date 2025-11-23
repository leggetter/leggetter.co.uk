# Leggetter Family Tree

This directory contains the genealogy data and tools for the Leggetter family tree.

## Files

- **`0001tree.gen`** - Raw genealogy data in Geneo format (binary file)
- **`geneo_parser.py`** - Core parser module for parsing the .gen file
- **`tree-view-family-chart.py`** - Interactive family tree generator
- **`templates/`** - Template files (CSS, JS, HTML) for the family tree view
- **`README.md`** - This file

## Generating the Interactive Family Tree

The interactive family tree is integrated as a Jekyll page at `/leggetter-family-tree/view/`:

```bash
# Generate the family tree view
npm run generate-family-tree

# Or run directly
python3 leggetter-family-tree/tree-view-family-chart.py leggetter-family-tree/0001tree.gen --output-jekyll
```

This updates [`pages/leggetter-family-tree-view.markdown`](../pages/leggetter-family-tree-view.markdown) with generated content injected between placeholder comments.

### Features

- **Full tree visualization** - All 202 people with parent-child relationships
- **Interactive navigation** - Click any person to center the tree on them
- **Search** - Type to find and jump to any person
- **Bi-directional relationships** - Both ancestry and descendants visible
- **Full-width layout** - Uses Jekyll's full layout (no sidebar)
- **Visual framing** - Border and shadow around the tree viewer
- **Version tracking** - Automatic timestamp on each generation

### How It Works

The generator script:
1. Parses the binary `.gen` file using [`geneo_parser.py`](geneo_parser.py)
2. Extracts all 202 family members with their relationships
3. Generates family-chart library compatible JSON data
4. Loads templates from the [`templates/`](templates/) directory
5. Injects the generated content into the Jekyll markdown file between `<!-- BEGIN GENERATED FAMILY TREE CONTENT -->` and `<!-- END GENERATED FAMILY TREE CONTENT -->` markers

This approach keeps the Jekyll page source under version control while allowing the tree data to be dynamically updated.

## Build Process

The family tree content is automatically generated during the build process. When you deploy the site using `npm run deploy`, Jekyll will:

1. Generate the family tree content (via `npm run generate-family-tree`)
2. Build the site into `_site/`
3. Push the `_site` directory to the `gh-pages` branch

## Deployment

The interactive family tree will be available at:
- **https://www.leggetter.co.uk/leggetter-family-tree/** - Landing page
- **https://www.leggetter.co.uk/leggetter-family-tree/view/** - Interactive family tree

## Updating the Genealogy Data

If you need to update the family tree data:

1. Update the `0001tree.gen` file with new genealogy data
2. Run `npm run generate-family-tree` to regenerate the view
3. Test locally with `npm run dev` or using Docker
4. Commit the updated `.gen` file and the updated Jekyll markdown file
5. Deploy with `npm run deploy`

## Technical Details

The parser correctly handles the Geneo binary file format which uses two separate numbering systems:
- **Person Numbers** - Sequential numbers in PERSON record headers
- **Person IDs** - Unique identifiers in ID fields

The `geneo_parser.py` module maintains a mapping between these two systems and is used as the single source of truth for all generator scripts.