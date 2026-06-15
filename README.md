# Servora Inventory

Smart inventory management for food service — track granular stock details and calculate how much food you can make from current inventory using recipe BOMs (bill of materials).

## Features

- **Inventory Management** — Capture detailed stock info: SKU, category, quantity, units, reorder levels, cost, supplier, storage location, expiry dates, and batch numbers
- **Recipe BOMs** — Define recipes with ingredient quantities linked to inventory items
- **Yield Calculator** — Automatically compute max producible yield and identify bottleneck ingredients
- **Low Stock Alerts** — Red badges when quantity falls at or below reorder level
- **Orders** — Place orders, kanban dashboard (new → processing → ready → delivered), inventory deduction on fulfill
- **Recipe pricing & profit** — Sale prices, estimated margins from inventory cost, locked COGS on fulfillment
- **Recipe barcodes** — EAN-13-style barcode per recipe on the pricing page
- **Inventory cost history** — Audit trail when cost per unit changes
- **Servora Branding** — Professional white UI with yellow accents and red alerts

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma 5 + MySQL
- Zod validation

## Prerequisites

- Node.js 18+
- MySQL 8+ (local or Docker)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create MySQL database

```sql
CREATE DATABASE servora_inventory;
```

Or with Docker:

```bash
docker run --name servora-mysql \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=servora_inventory \
  -p 3306:3306 \
  -d mysql:8
```

### 3. Configure environment

Copy the example env file and set your MySQL connection:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/servora_inventory"
```

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

This creates the schema and an empty venue (business, tables, POS settings, and login accounts). Add raw materials, stock, and products through the app or `/admin/data` import.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Reset to empty venue + default logins |
| `npm run db:push` | Push schema without migration (dev shortcut) |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats, yield preview, and low-stock alerts |
| `/inventory` | Searchable inventory list with filters |
| `/inventory/new` | Add new inventory item |
| `/inventory/[id]/edit` | Edit existing item |
| `/recipes` | Recipe list with computed max yield |
| `/recipes/new` | Create recipe with BOM ingredients |
| `/recipes/[id]/edit` | Edit recipe |
| `/yield` | Full yield calculator — what can you make today? |
| `/orders` | Order kanban dashboard |
| `/orders/new` | Place a new order |
| `/orders/[id]` | Order detail, profit breakdown, inventory deductions |
| `/orders/costing` | Guide: inventory pricing, history, and order profit |
| `/recipes/pricing` | Sale prices, margins, barcodes |

## Yield Calculation

For each recipe, the app computes:

```
maxYield = MIN( floor(available_qty / required_qty) ) across all ingredients
```

The ingredient that limits production is shown as the **bottleneck**. Ingredient units must match inventory units (no automatic unit conversion in MVP).

**Example:** Margherita Pizza needs 100g cheese per pizza. With 250g cheese in stock → max **2 pizzas** (cheese is the bottleneck).

## Project Structure

```
app/
  actions/          # Server actions (inventory, recipes)
  inventory/        # Inventory pages
  recipes/          # Recipe pages
  yield/            # Yield calculator page
components/
  layout/           # AppShell, Header, Sidebar
  inventory/        # InventoryTable, InventoryForm, Filters
  recipes/          # RecipeTable, RecipeForm
  yield/            # YieldCard
  ui/               # Button, Input, Select, Badge, Textarea
lib/
  db.ts             # Prisma client
  yield.ts          # Yield calculation engine
  units.ts          # Unit helpers
  validations.ts    # Zod schemas
prisma/
  schema.prisma     # Database schema
  seed.ts           # Sample data
public/
  servora-logo.png  # Brand logo
```
