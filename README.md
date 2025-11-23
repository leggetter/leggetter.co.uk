# leggetter.co.uk website

A Jekyll-based personal website.

## Prerequisites

* Docker (or OrbStack)
* Git

## First-time setup

Initialize and update git submodules (required for site content):

```sh
git submodule init && git submodule sync && git submodule update
```

Build the Docker image:

```sh
docker build -t leggetter-jekyll .
```

## Running the site locally

Start the Jekyll server in Docker:

```sh
docker run --rm -p 4000:4000 -v $(pwd):/site leggetter-jekyll
```

The site will be available at http://localhost:4000

The server runs in watch mode, so changes to files will automatically rebuild the site.

To stop the server, press `Ctrl+C` in the terminal.

## Deploy

```sh
yarn deploy
```

## Alternative: Running without Docker

If you prefer to run Jekyll natively (not recommended due to compatibility issues on modern macOS):

### Prerequisites
* Node.JS
* Ruby (via asdf recommended)

### Install dependencies
```sh
bundle install
yarn install
```

### Run locally
```sh
yarn dev
```

**Note:** Native execution may encounter compilation issues with the `eventmachine` gem on macOS. Docker is the recommended approach.
