-- BCVENT starter schema for Supabase PostgreSQL.
-- Run once in Supabase Dashboard > SQL Editor. Review and test RLS before opening to the public.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null default 'สมาชิกใหม่' check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,36}$'),
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'แชทใหม่' check (char_length(title) between 1 and 80),
  room_type text not null default 'group' check (room_type in ('direct','group')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  body text not null default '' check (char_length(body) <= 500),
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  is_sensitive boolean not null default false,
  comments_enabled boolean not null default true,
  media_url text,
  media_type text,
  repost_of uuid references public.posts(id) on delete cascade,
  quote_of uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  check (not (repost_of is not null and quote_of is not null)),
  check (char_length(body) > 0 or media_url is not null or repost_of is not null or quote_of is not null)
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  kind text not null check (kind in ('like','comment','repost','quote','follow','message','community')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  media_path text,
  media_type text,
  created_at timestamptz not null default now(),
  check (char_length(body) > 0 or media_path is not null)
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  allow_multiple boolean not null default false,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  position integer not null default 0
);

create table if not exists public.poll_votes (
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_created_at_idx on public.posts (user_id, created_at desc);
create index if not exists comments_post_created_at_idx on public.comments (post_id, created_at asc);
create index if not exists notifications_user_created_at_idx on public.notifications (user_id, created_at desc);
create index if not exists messages_room_created_at_idx on public.messages (room_id, created_at asc);
create index if not exists communities_slug_idx on public.communities (slug);

-- Auto-create a profile for every newly registered Supabase Auth account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferred_name text;
  preferred_username text;
begin
  preferred_name := coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(coalesce(new.email, 'member'), '@', 1), 'สมาชิกใหม่');
  preferred_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  insert into public.profiles (id, username, display_name)
  values (new.id, preferred_username, left(preferred_name, 60))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper functions use a fixed search_path to prevent object-shadowing attacks.
create or replace function public.is_room_member(target_room uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.chat_room_members m where m.room_id = target_room and m.user_id = auth.uid()); $$;

create or replace function public.is_room_admin(target_room uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.chat_room_members m where m.room_id = target_room and m.user_id = auth.uid() and m.role in ('owner','admin')); $$;

create or replace function public.is_community_member(target_community uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.community_members m where m.community_id = target_community and m.user_id = auth.uid()); $$;

create or replace function public.is_community_admin(target_community uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.community_members m where m.community_id = target_community and m.user_id = auth.uid() and m.role in ('owner','admin','moderator')); $$;

grant execute on function public.is_room_member(uuid) to anon, authenticated;
grant execute on function public.is_room_admin(uuid) to authenticated;
grant execute on function public.is_community_member(uuid) to anon, authenticated;
grant execute on function public.is_community_admin(uuid) to authenticated;

-- Enforce group-chat capacity on the database, including concurrent join attempts.
create or replace function public.enforce_room_member_limit()
returns trigger language plpgsql security definer set search_path = public
as $$
declare member_count integer; room_kind text;
begin
  select room_type into room_kind from public.chat_rooms where id = new.room_id for update;
  select count(*) into member_count from public.chat_room_members where room_id = new.room_id;
  if room_kind = 'group' and member_count >= 200 then
    raise exception 'This group has reached the 200-member limit';
  elsif room_kind = 'direct' and member_count >= 2 then
    raise exception 'A direct chat can have only two members';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_group_members on public.chat_room_members;
create trigger limit_group_members before insert on public.chat_room_members
for each row execute procedure public.enforce_room_member_limit();

-- Enforce poll expiry and single-choice voting server-side (the UI still needs to be built).
create or replace function public.validate_poll_vote()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target_poll uuid; allows_multiple boolean; poll_ends_at timestamptz;
begin
  select po.poll_id, p.allow_multiple, p.ends_at into target_poll, allows_multiple, poll_ends_at
  from public.poll_options po join public.polls p on p.id = po.poll_id where po.id = new.option_id;
  if target_poll is null then raise exception 'Poll option not found'; end if;
  if poll_ends_at is not null and poll_ends_at <= now() then raise exception 'This poll has ended'; end if;
  if not allows_multiple and exists (
    select 1 from public.poll_votes v join public.poll_options o on o.id = v.option_id
    where v.user_id = new.user_id and o.poll_id = target_poll
  ) then raise exception 'You have already voted in this poll'; end if;
  return new;
end;
$$;
drop trigger if exists validate_poll_vote_before_insert on public.poll_votes;
create trigger validate_poll_vote_before_insert before insert on public.poll_votes
for each row execute procedure public.validate_poll_vote();

-- Enable RLS on all application tables.
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Profiles and follows
create policy "profiles readable" on public.profiles for select to anon, authenticated using (true);
create policy "profile owner inserts" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profile owner updates" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "follows readable" on public.follows for select to anon, authenticated using (true);
create policy "follow self" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "unfollow self" on public.follows for delete to authenticated using (follower_id = auth.uid());

-- Posts: sensitive is a content-warning flag; visibility is the access control.
create policy "read public or permitted posts" on public.posts for select to anon, authenticated
using (
  visibility = 'public'
  or user_id = auth.uid()
  or (visibility = 'followers' and exists (
    select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = posts.user_id
  ))
);
create policy "create own posts" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "update own posts" on public.posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own posts" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "likes readable" on public.post_likes for select to anon, authenticated using (true);
create policy "like as self" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike as self" on public.post_likes for delete to authenticated using (user_id = auth.uid());
create policy "saves private to owner" on public.post_saves for select to authenticated using (user_id = auth.uid());
create policy "save as self" on public.post_saves for insert to authenticated with check (user_id = auth.uid());
create policy "unsave as self" on public.post_saves for delete to authenticated using (user_id = auth.uid());

create policy "read comments when thread is open" on public.comments for select to anon, authenticated
using (exists (select 1 from public.posts p where p.id = comments.post_id and p.comments_enabled = true));
create policy "comment as self on open post" on public.comments for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = comments.post_id and p.comments_enabled = true));
create policy "delete own comment" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "edit own comment" on public.comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications only for recipient" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "recipient marks notification read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rooms and messages. Limit each group to 200 members in application logic and enforce again before production.
create policy "read rooms as member or creator" on public.chat_rooms for select to authenticated using (created_by = auth.uid() or public.is_room_member(id));
create policy "create room as self" on public.chat_rooms for insert to authenticated with check (created_by = auth.uid());
create policy "manage room as owner or admin" on public.chat_rooms for update to authenticated using (created_by = auth.uid() or public.is_room_admin(id)) with check (created_by = auth.uid() or public.is_room_admin(id));
create policy "delete room as owner" on public.chat_rooms for delete to authenticated using (created_by = auth.uid());
create policy "members can view room members" on public.chat_room_members for select to authenticated using (public.is_room_member(room_id) or exists (select 1 from public.chat_rooms r where r.id = room_id and r.created_by = auth.uid()));
create policy "room creator or admin adds members" on public.chat_room_members for insert to authenticated with check (
  (exists (select 1 from public.chat_rooms r where r.id = room_id and r.created_by = auth.uid()) and user_id = auth.uid() and role = 'owner')
  or (public.is_room_admin(room_id) and role in ('admin','member'))
);
create policy "members leave or admins remove" on public.chat_room_members for delete to authenticated using (user_id = auth.uid() or public.is_room_admin(room_id));
create policy "read messages as room member" on public.messages for select to authenticated using (public.is_room_member(room_id));
create policy "send message as room member" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_room_member(room_id));
create policy "delete own message or admin" on public.messages for delete to authenticated using (sender_id = auth.uid() or public.is_room_admin(room_id));

-- Communities
create policy "read public communities or joined private ones" on public.communities for select to anon, authenticated
using (visibility = 'public' or owner_id = auth.uid() or public.is_community_member(id));
create policy "create community as self" on public.communities for insert to authenticated with check (owner_id = auth.uid());
create policy "owner or admin updates community" on public.communities for update to authenticated using (owner_id = auth.uid() or public.is_community_admin(id)) with check (owner_id = auth.uid() or public.is_community_admin(id));
create policy "owner deletes community" on public.communities for delete to authenticated using (owner_id = auth.uid());
create policy "read community members when allowed" on public.community_members for select to anon, authenticated using (public.is_community_member(community_id) or exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public'));
create policy "owner/admin adds community members" on public.community_members for insert to authenticated with check (
  (user_id = auth.uid() and role = 'owner' and exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid()))
  or (public.is_community_admin(community_id) and role in ('admin','moderator','member'))
);
create policy "member leaves or admin removes" on public.community_members for delete to authenticated using (user_id = auth.uid() or public.is_community_admin(community_id));

-- Polls (UI integration is a later milestone).
create policy "polls follow post visibility" on public.polls for select to anon, authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy "author creates poll" on public.polls for insert to authenticated with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy "author updates poll" on public.polls for update to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy "read poll options" on public.poll_options for select to anon, authenticated using (exists (select 1 from public.polls po join public.posts p on p.id = po.post_id where po.id = poll_id));
create policy "author manages poll options" on public.poll_options for insert to authenticated with check (exists (select 1 from public.polls po join public.posts p on p.id = po.post_id where po.id = poll_id and p.user_id = auth.uid()));
create policy "author deletes poll options" on public.poll_options for delete to authenticated using (exists (select 1 from public.polls po join public.posts p on p.id = po.post_id where po.id = poll_id and p.user_id = auth.uid()));
create policy "read votes only to signed-in users" on public.poll_votes for select to authenticated using (true);
create policy "vote as self" on public.poll_votes for insert to authenticated with check (user_id = auth.uid());
create policy "remove own vote" on public.poll_votes for delete to authenticated using (user_id = auth.uid());

-- Content warning media in this starter is delivered via a public bucket; sensitive flag is not a privacy barrier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "read post media" on storage.objects for select to anon, authenticated using (bucket_id = 'post-media');
create policy "upload to own post media folder" on storage.objects for insert to authenticated
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own post media" on storage.objects for update to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own post media" on storage.objects for delete to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Notification automation. These triggers never create a notification when a user acts on themself.
create or replace function public.notify_post_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target_owner uuid; target_post uuid; notification_kind text;
begin
  if tg_table_name = 'post_likes' then
    select user_id into target_owner from public.posts where id = new.post_id;
    target_post := new.post_id; notification_kind := 'like';
  elsif tg_table_name = 'comments' then
    select user_id into target_owner from public.posts where id = new.post_id;
    target_post := new.post_id; notification_kind := 'comment';
  elsif tg_table_name = 'posts' then
    if new.repost_of is not null then
      select user_id into target_owner from public.posts where id = new.repost_of;
      target_post := new.repost_of; notification_kind := 'repost';
    elsif new.quote_of is not null then
      select user_id into target_owner from public.posts where id = new.quote_of;
      target_post := new.quote_of; notification_kind := 'quote';
    else
      return new;
    end if;
  else
    return new;
  end if;
  if target_owner is not null and target_owner <> new.user_id then
    insert into public.notifications(user_id, actor_id, post_id, kind)
    values (target_owner, new.user_id, target_post, notification_kind);
  end if;
  return new;
end;
$$;

-- The trigger function uses user_id on each supported table (posts, comments, post_likes).
drop trigger if exists notify_on_like on public.post_likes;
create trigger notify_on_like after insert on public.post_likes for each row execute procedure public.notify_post_owner();
drop trigger if exists notify_on_comment on public.comments;
create trigger notify_on_comment after insert on public.comments for each row execute procedure public.notify_post_owner();
drop trigger if exists notify_on_repost_or_quote on public.posts;
create trigger notify_on_repost_or_quote after insert on public.posts for each row execute procedure public.notify_post_owner();


-- Direct-message attachments belong in a private bucket and require room membership to upload/read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "read room files as member" on storage.objects for select to authenticated using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);
create policy "upload room files as member" on storage.objects for insert to authenticated with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);
create policy "delete own room files" on storage.objects for delete to authenticated using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);
