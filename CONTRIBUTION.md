# Contribution

DO NOT work on the code from GreasyFork. It is built code. Work on this repository instead.

## Prerequisites

- [Node.js](https://nodejs.org/) ^20.11
- [pnpm](https://pnpm.io/)

## Getting Started

### Clone the repository

```bash
git clone https://github.com/mdmrk/fcx.git
cd fcx
```

### Install dependencies

```bash
pnpm install
```

## Development

### Start development server

```bash
# Without hosted local server
pnpm run build:watch

# With hosted local server
pnpm dev
```

## Guidelines

- Turn on `devMode` in [config.ts](src/config.ts) to get verbose console logs.
- You can write in pure JavaScript. Just create a new `.js` file in [src/lib](src/lib) and import it in [src/index.ts](src/index.ts)
- Try to follow "Inject when necessary, remove when not" principle. Just write your code in your own way and tell WindSurf, Cursor or VScode to handle it for you based on other functions here.
- Document your code
