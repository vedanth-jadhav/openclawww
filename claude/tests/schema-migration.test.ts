import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260330140000_foundation_schema.sql',
)

describe('foundation schema migration', () => {
  const migrationSql = readFileSync(migrationPath, 'utf8')

  it('defines the marketplace core tables and scaffold tables', () => {
    expect(migrationSql).toContain('create table public.profiles')
    expect(migrationSql).toContain('create table public.items')
    expect(migrationSql).toContain('create table public.reviews')
    expect(migrationSql).toContain('create table public.wizard_sessions')
    expect(migrationSql).toContain('create table public.seller_profiles')
    expect(migrationSql).toContain('create table public.payment_products')
  })

  it('enforces canonical slug and placeholder scaffold constraints', () => {
    expect(migrationSql).toContain('constraint items_slug_canonical check')
    expect(migrationSql).toContain("'^[a-z0-9]+(?:-[a-z0-9]+)*$'")
    expect(migrationSql).toContain('constraint items_scaffold_placeholder_check check')
    expect(migrationSql).toContain('constraint seller_profiles_placeholder_only check')
    expect(migrationSql).toContain('constraint payment_products_placeholder_only check')
  })

  it('creates auth profile sync and updated_at triggers', () => {
    expect(migrationSql).toContain('create or replace function public.sync_profile_from_auth_user()')
    expect(migrationSql).toContain('create trigger on_auth_user_created')
    expect(migrationSql).toContain('create trigger on_auth_user_updated')
    expect(migrationSql).toContain('create or replace function public.set_updated_at()')
    expect(migrationSql).toContain('create trigger handle_profiles_updated_at')
    expect(migrationSql).toContain('create trigger handle_items_updated_at')
    expect(migrationSql).toContain('create trigger handle_reviews_updated_at')
    expect(migrationSql).toContain('create trigger handle_wizard_sessions_updated_at')
  })
})
