-- Browser clients use a publishable key. Admin access is granted by the
-- authenticated user's members.is_admin flag and enforced by RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.members enable row level security;
alter table public.cards enable row level security;
alter table public.card_owners enable row level security;
alter table public.settings enable row level security;
alter table public.boss_challenges enable row level security;
alter table public.boss_purchases enable row level security;
alter table public.point_logs enable row level security;
alter table public.points_logs enable row level security;
alter table public.daily_logins enable row level security;
alter table public.shipping_orders enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;
alter table public.grading_submissions enable row level security;

grant select, insert, update, delete on table
  public.members,
  public.cards,
  public.card_owners,
  public.settings,
  public.boss_challenges,
  public.boss_purchases,
  public.point_logs,
  public.points_logs,
  public.daily_logins,
  public.shipping_orders,
  public.shop_products,
  public.shop_orders,
  public.grading_submissions
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "Storefront can read active shop products" on public.shop_products;
drop policy if exists "Admins can manage members" on public.members;
drop policy if exists "Admins can manage cards" on public.cards;
drop policy if exists "Admins can manage card owners" on public.card_owners;
drop policy if exists "Admins can manage settings" on public.settings;
drop policy if exists "Admins can manage boss challenges" on public.boss_challenges;
drop policy if exists "Admins can manage boss purchases" on public.boss_purchases;
drop policy if exists "Admins can manage point logs" on public.point_logs;
drop policy if exists "Admins can manage shop point logs" on public.points_logs;
drop policy if exists "Admins can manage daily logins" on public.daily_logins;
drop policy if exists "Admins can manage shipping orders" on public.shipping_orders;
drop policy if exists "Admins can manage shop products" on public.shop_products;
drop policy if exists "Admins can manage shop orders" on public.shop_orders;
drop policy if exists "Admins can manage grading submissions" on public.grading_submissions;
drop policy if exists "Admins can manage admin storage" on storage.objects;

create policy "Storefront can read active shop products"
on public.shop_products for select to authenticated
using (is_active = true);

create policy "Admins can manage members"
on public.members for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage cards"
on public.cards for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage card owners"
on public.card_owners for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage settings"
on public.settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage boss challenges"
on public.boss_challenges for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage boss purchases"
on public.boss_purchases for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage point logs"
on public.point_logs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage shop point logs"
on public.points_logs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage daily logins"
on public.daily_logins for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage shipping orders"
on public.shipping_orders for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage shop products"
on public.shop_products for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage shop orders"
on public.shop_orders for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage grading submissions"
on public.grading_submissions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage admin storage"
on storage.objects for all to authenticated
using (
  bucket_id in ('card-images', 'shop-images', 'grading-images')
  and public.is_admin()
)
with check (
  bucket_id in ('card-images', 'shop-images', 'grading-images')
  and public.is_admin()
);
