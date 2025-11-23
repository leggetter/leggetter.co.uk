# Leggetter Family Tree

This directory contains the genealogy data and tools for the Leggetter family tree.

## Files

- **`0001tree.gen`** - Raw genealogy data in Geneo format (binary file)
- **`geneo.jar`** - Original Java applet for viewing the tree (legacy)
- **`parser.py`** - Python script to parse the `.gen` file and generate an interactive HTML page
- **`view/index.html`** - Generated HTML file (not committed to git, built during site generation)

## Generating the Interactive Family Tree

The interactive HTML family tree is automatically generated during the build process, but you can also generate it manually:

```bash
# Generate the interactive family tree HTML
npm run generate-family-tree

# Or run directly
python3 leggetter-family-tree/parser.py leggetter-family-tree/0001tree.gen > leggetter-family-tree/view/index.html
```

The generated HTML file is excluded from git (via `.gitignore`) because it's a build artifact. When you deploy the site using `npm run deploy`, Jekyll will:

1. Generate the family tree HTML (via the script)
2. Build the site into `_site/`
3. Push the `_site` directory to the `gh-pages` branch

## Deployment

The generated family tree will be available at:
- **https://www.leggetter.co.uk/leggetter-family-tree/** - Landing page with information
- **https://www.leggetter.co.uk/leggetter-family-tree/view/** - Interactive family tree

## Updating the Genealogy Data

If you need to update the family tree data:

1. Update the `0001tree.gen` file with new genealogy data
2. Run `npm run generate-family-tree` to regenerate the HTML
3. Test locally with `npm run dev` or using Docker
4. Commit the updated `.gen` file (but not the generated HTML)
5. Deploy with `npm run deploy`