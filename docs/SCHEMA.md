# Database Schema

## Table: `items`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique item identifier |
| `name` | `text` | NOT NULL | Food item name (e.g. "Wholemeal Bread") |
| `brand` | `text` | — | Brand name, optional |
| `quantity` | `integer` | NOT NULL, CHECK ≥ 0 | Current stock count |
| `unit` | `text` | NOT NULL | Unit of measure (e.g. "loaves", "cans", "kg") |
| `expiry` | `date` | NOT NULL | Expiry date — inventory is sorted by this ascending |
| `location` | `text` | NOT NULL | Storage location (e.g. "Location 1", or a custom free-text value) |
| `logged_by` | `text` | NOT NULL | Name of the volunteer who logged the item |
| `notes` | `text` | — | Optional free-text notes |
| `status` | `text` | NOT NULL, default `'available'` | `'available'` or `'taken'`; the UI only shows `available` rows |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp when the row was inserted |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Auto-updated on every change via trigger |

### Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Indexes

```sql
CREATE INDEX items_expiry_idx   ON items (expiry ASC);
CREATE INDEX items_location_idx ON items (location);
CREATE INDEX items_status_idx   ON items (status);
```

---

## Row Level Security (RLS)

RLS is enabled on the `items` table. All access goes through the Supabase anon key (guests) or authenticated session (admins).

| Policy | Role | Operation | Rule |
|---|---|---|---|
| Anyone can read items | `anon` + `authenticated` | SELECT | `USING (true)` — no restriction |
| Authenticated users can insert | `authenticated` | INSERT | `WITH CHECK (true)` |
| Authenticated users can update | `authenticated` | UPDATE | `USING (true)` |
| Authenticated users can delete | `authenticated` | DELETE | `USING (true)` |

**Effect:**
- Guest users (anon key) can read all `available` items — the WHERE clause filtering `status = 'available'` is enforced by the application, not RLS
- Only signed-in admins can insert, update, or delete rows
- The anon key cannot write anything even if the application code is modified client-side

---

## Status values

| Value | Meaning | UI behaviour |
|---|---|---|
| `'available'` | Item is in stock | Shown in inventory list |
| `'taken'` | Cleared via Clear Stock | Hidden from inventory list (soft delete) |

Adjust Stock updates `quantity` while leaving `status = 'available'`. Clear Stock sets `status = 'taken'`.
