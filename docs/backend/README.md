# H.E.R.S.365 Backend Documentation

Welcome to the backend documentation for the H.E.R.S.365 system. This folder contains technical details on how the system architecture is structured, the data models used, and a master list of all API endpoints.

## 📁 Documentation Guide

- [**Master List**](./master_list.md): A complete registry of all API routes and database tables.
- [**Workflow & Architecture**](./workflow.md): Visual diagrams and sequence flows for system operations.

## 🚀 Getting Started

The backend is a Node.js/Express application using TypeScript. It leverages Drizzle ORM to interface with a PostgreSQL database.

### Core Technologies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: JWT & Bcrypt (Optimized for High Concurrency)
- **Integrations**: Stripe (Payments), OpenAI (AI Features), MaxPreps (Sports Data)

## 🛠️ Development

To run the backend locally:
1. Navigate to the `server` directory.
2. Install dependencies: `npm install`
3. Set up your `.env` file (see `.env.example`).
4. Start the development server: `npm run dev`
