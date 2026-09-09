-- A quieter hero for the legal pages: no image, no reveal, a .stand standfirst.
alter table public.pages drop constraint if exists pages_hero_variant_check;
alter table public.pages add constraint pages_hero_variant_check
  check (hero_variant in ('home', 'page', 'overlaid', 'event', 'plain'));
