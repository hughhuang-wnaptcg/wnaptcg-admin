drop policy if exists "Admins can manage shop point logs" on public.points_logs;
drop policy if exists "Admins can manage daily logins" on public.daily_logins;
drop policy if exists "Admins can manage shipping orders" on public.shipping_orders;
drop policy if exists "Admins can manage shop products" on public.shop_products;
drop policy if exists "Admins can manage shop orders" on public.shop_orders;
drop policy if exists "Admins can manage grading submissions" on public.grading_submissions;
drop policy if exists "Admins can manage admin storage" on storage.objects;

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
