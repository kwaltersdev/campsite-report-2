# Data Access Layer

## Purpose

This directory implements the **Data Access Object (DAO)** pattern to abstract database operations. Each subdirectory corresponds to a domain (e.g., `auth/`, `campgrounds/`) and contains:
- **Type definitions**: TypeScript types representing database entities
- **DAO classes**: Static methods for CRUD operations on that entity

This separation ensures database logic is centralized, reusable, and independent of business logic.

## Using Existing DAOs

Import and use DAO classes instead of writing raw queries:

```typescript
import { CampgroundDAO } from './data-access/campgrounds/Campground';

const campground = await CampgroundDAO.findById(1);
const all = await CampgroundDAO.findAll();
```

## Adding New DAO Objects

1. **Create domain directory**: `data-access/<domain>/`
2. **Define entity type and DAO class** in a single file:
   - Type name: `Entity` (e.g., `Campground`)
   - Class name: `EntityDAO` (e.g., `CampgroundDAO`)
   - Use `import { query } from '../../utilities'`
   - All methods are static and async
3. **Use parameterized queries** exclusively: `query(sql, [params])`
4. **Return typed objects** matching the entity type
5. **Handle nulls explicitly**: Return `null` for "not found" cases

## Example Structure

```typescript
export type Entity = { id: number; name: string };

export class EntityDAO {
  static async findById(id: number): Promise<Entity | null> {
    const result = await query('SELECT * FROM entities WHERE id = $1', [id]);
    return result.rowCount === 0 ? null : (result.rows[0] as Entity);
  }

  static async findAll(): Promise<Entity[]> {
    const result = await query('SELECT * FROM entities');
    return result.rows as Entity[];
  }
}
```
