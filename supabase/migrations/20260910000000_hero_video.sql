-- The homepage hero plays an aftermovie over its still.
--
-- main.js probes the WebM named on the poster image and, when it resolves and
-- prefers-reduced-motion is not set, mounts a muted looping <video> over the
-- hero. The still carries the hero until then, so these are genuinely optional:
-- a page with no clip renders exactly as it does today.
alter table public.pages
  add column if not exists hero_video_webm text,
  add column if not exists hero_video_mp4  text;

comment on column public.pages.hero_video_webm is
  'Optional hero aftermovie (WebM). Rendered as data-video-webm on the poster.';
comment on column public.pages.hero_video_mp4 is
  'Optional hero aftermovie (MP4 fallback).';
