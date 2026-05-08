import { query } from '../../utilities.js';

export type Campground = {
  id: number;
  name: string;
};

export class CampgroundDAO {
  static async create(name: string): Promise<void> {
    await query('INSERT INTO campgrounds (name) VALUES ($1)', [name]);
  }

  static async findAll(): Promise<Campground[]> {
    const result = await query('SELECT id, name FROM campgrounds ORDER BY name');
    return result.rows as Campground[];
  }

  static async findById(id: number): Promise<Campground | null> {
    const result = await query('SELECT id, name FROM campgrounds WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0] as Campground;
  }
}