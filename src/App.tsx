import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Bell, Bookmark, Check, ChevronDown, CircleHelp, Compass, FileText, Hash, Heart,
  Home, Image as ImageIcon, LockKeyhole, LogIn, LogOut, MessageCircle, MessageSquare,
  MoreHorizontal, Plus, Quote, Repeat2, Search, Send, Settings2, ShieldAlert, Sparkles,
  Users, UserRound, X, Paperclip, Video, BarChart3, Flower2, Eye, EyeOff, Menu
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Profile = {
  id?: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
};
type Post = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  is_sensitive: boolean;
  comments_enabled: boolean;
  visibility: 'public' | 'followers' | 'private';
  media_url?: string | null;
  media_type?: string | null;
  repost_of?: string | null;
  quote_of?: string | null;
  community_id?: string | null;
  author?: Profile;
  original?: Post;
  likes?: { user_id: string }[];
  saves?: { user_id: string }[];
  reposts?: { id: string; user_id: string }[];
  comments_count?: { count: number }[];
  likesCount?: number;
  repostsCount?: number;
  commentsCount?: number;
  liked?: boolean;
  saved?: boolean;
  reposted?: boolean;
};
type Comment = { id: string; body: string; created_at: string; author?: Profile; user_id: string };
type AppNotification = { id: string; kind: string; created_at: string; read_at: string | null; actor?: Profile; post_id: string | null };
type Tab = 'home' | 'explore' | 'notifications' | 'messages' | 'communities' | 'saved' | 'profile';

const POST_SELECT = '*, author:profiles!posts_user_id_fkey(id, username, display_name, avatar_url, cover_url, bio), likes:post_likes(user_id), saves:post_saves(user_id), reposts:posts!posts_repost_of_fkey(id,user_id), comments_count:comments(count)';
const stamp = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const DEMO_AUTHOR: Profile = { username: 'bcvent_team', display_name: 'BCVENT Team', bio: 'พื้นที่ของเรื่องราวและผู้คน' };
const DEMO_POSTS: Post[] = [
  { id: 'demo-1', user_id: 'demo-user-1', body: 'ยินดีต้อนรับสู่ BCVENT พื้นที่เล็ก ๆ สำหรับเรื่องราวของคุณ จะโพสต์สั้น ๆ รีโพสต์ หรือเปิดประเด็นพูดคุย ก็เริ่มได้ที่นี่', created_at: stamp(12), is_sensitive: false, comments_enabled: true, visibility: 'public', author: DEMO_AUTHOR, likesCount: 128, repostsCount: 24, commentsCount: 9, liked: false, saved: false, reposted: false },
  { id: 'demo-2', user_id: 'demo-user-2', body: 'มีใครชอบบรรยากาศคาเฟ่เงียบ ๆ ในวันฝนตกเหมือนกันไหม นั่งอ่านหนังสือไป ฟังเสียงฝนไป เป็นช่วงเวลาที่ดีมาก', created_at: stamp(47), is_sensitive: false, comments_enabled: true, visibility: 'public', author: { username: 'manao_notes', display_name: 'มะนาว', bio: 'จดบันทึกเรื่องเล็ก ๆ' }, likesCount: 84, repostsCount: 12, commentsCount: 16, liked: false, saved: false, reposted: false },
  { id: 'demo-3', user_id: 'demo-user-3', body: 'กำลังทำโปรเจกต์ส่วนตัวอยู่ มีใครมีเทคนิคจัดการเวลาให้ไม่หมดไฟบ้าง ขอแลกเปลี่ยนกันหน่อยครับ', created_at: stamp(96), is_sensitive: false, comments_enabled: true, visibility: 'public', author: { username: 'kenji_dev', display_name: 'เคนจิ' }, likesCount: 35, repostsCount: 7, commentsCount: 0, liked: false, saved: false, reposted: false },
  { id: 'demo-4', user_id: 'demo-user-4', body: 'ตัวอย่างโพสต์เซนซิทีฟ — เนื้อหาหรือภาพถูกซ่อนไว้จนกว่าคุณจะเลือกเปิดดูเอง', created_at: stamp(180), is_sensitive: true, comments_enabled: false, visibility: 'public', author: { username: 'quiet_window', display_name: 'quiet window' }, likesCount: 7, repostsCount: 2, commentsCount: 0, liked: false, saved: false, reposted: false },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function normalize(row: any, userId?: string): Post {
  const likes = (row.likes ?? []) as { user_id: string }[];
  const saves = (row.saves ?? []) as { user_id: string }[];
  const reposts = (row.reposts ?? []) as { id: string; user_id: string }[];
  return {
    ...row,
    likes,
    saves,
    reposts,
    likesCount: likes.length,
    repostsCount: reposts.length,
    commentsCount: Number(row.comments_count?.[0]?.count ?? 0),
    liked: Boolean(userId && likes.some((item) => item.user_id === userId)),
    saved: Boolean(userId && saves.some((item) => item.user_id === userId)),
    reposted: Boolean(userId && reposts.some((item) => item.user_id === userId)),
  } as Post;
}
function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'ตอนนี้';
  if (minutes < 60) return `${minutes} นาที`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ชม.`;
  return `${Math.floor(minutes / 1440)} วัน`;
}
function initials(profile?: Profile) {
  return (profile?.display_name || profile?.username || 'B').trim().slice(0, 1).toUpperCase();
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>(DEMO_POSTS);
  const [tab, setTab] = useState<Tab>('home');
  const [feedMode, setFeedMode] = useState<'for-you' | 'following'>('for-you');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [sensitive, setSensitive] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentLists, setCommentLists] = useState<Record<string, Comment[]>>({});
  const [quoteTarget, setQuoteTarget] = useState<Post | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: '', display_name: '', bio: '', avatar_url: '', cover_url: '' });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchText, setSearchText] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setPosts(DEMO_POSTS);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!supabase || !session?.user) { setProfile(null); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data) setProfile(data as Profile);
    else if (error) setMessage(`อ่านโปรไฟล์ไม่สำเร็จ: ${error.message}`);
  }, [session]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setPosts((old) => old.length ? (tab === 'home' && feedMode === 'for-you' ? shuffle(old) : old) : [...DEMO_POSTS]);
      setLoading(false);
      return;
    }
    if ((tab === 'saved' || tab === 'profile') && !session?.user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    try {
      let query = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(60);
      if (tab === 'saved' && session?.user) {
        const { data: savedRows, error: saveError } = await supabase.from('post_saves').select('post_id').eq('user_id', session.user.id).limit(60);
        if (saveError) throw saveError;
        const ids = (savedRows ?? []).map((row) => row.post_id);
        if (!ids.length) { setPosts([]); setLoading(false); return; }
        query = supabase.from('posts').select(POST_SELECT).in('id', ids).order('created_at', { ascending: false }).limit(60) as any;
      } else if (tab === 'profile' && session?.user) {
        query = supabase.from('posts').select(POST_SELECT).eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(60) as any;
      } else if (feedMode === 'following' && session?.user) {
        const { data: follows, error: followError } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
        if (followError) throw followError;
        const ids = [...new Set([session.user.id, ...(follows ?? []).map((f) => f.following_id)])];
        query = supabase.from('posts').select(POST_SELECT).in('user_id', ids).order('created_at', { ascending: false }).limit(60) as any;
      }
      const { data, error } = await query;
      if (error) throw error;
      let rows = (data ?? []).map((row: any) => normalize(row, session?.user.id));
      const originalIds = [...new Set(rows.map((row) => row.repost_of || row.quote_of).filter(Boolean))] as string[];
      if (originalIds.length) {
        const { data: originalRows } = await supabase.from('posts').select(POST_SELECT).in('id', originalIds);
        const originals = new Map<string, Post>((originalRows ?? []).map((row: any) => [row.id, normalize(row, session?.user.id)] as [string, Post]));
        rows = rows.map((row) => ({ ...row, original: originals.get((row.repost_of || row.quote_of) as string) }));
      }
      if (feedMode === 'for-you' && tab === 'home') rows = shuffle(rows);
      setPosts(rows);
    } catch (err: any) {
      setMessage(`โหลดฟีดไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setLoading(false);
    }
  }, [session, feedMode, tab]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);
  useEffect(() => { void loadFeed(); }, [loadFeed]);

  const loadNotifications = useCallback(async () => {
    if (!supabase || !session?.user) { setNotifications([]); return; }
    const { data, error } = await supabase.from('notifications')
      .select('id,kind,created_at,read_at,post_id,actor:profiles!notifications_actor_id_fkey(username,display_name,avatar_url)')
      .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(40);
    if (error) { setMessage(`โหลดการแจ้งเตือนไม่สำเร็จ: ${error.message}`); return; }
    const unread = (data ?? []).filter((item: any) => !item.read_at).map((item: any) => item.id);
    const viewedAt = new Date().toISOString();
    setNotifications((data ?? []).map((item: any) => ({ ...item, read_at: item.read_at ?? (unread.includes(item.id) ? viewedAt : null) })) as AppNotification[]);
    if (unread.length) await supabase.from('notifications').update({ read_at: viewedAt }).in('id', unread);
  }, [session]);
  useEffect(() => { if (tab === 'notifications') void loadNotifications(); }, [tab, loadNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications]);
  const notificationBadge = isSupabaseConfigured ? unreadCount : 3;
  const visiblePosts = useMemo(() => {
    let base = posts;
    if (!supabase && tab === 'saved') base = base.filter((p) => p.saved);
    if (!supabase && tab === 'profile') base = base.filter((p) => p.user_id === 'demo-self');
    const search = searchText.trim().toLowerCase();
    if (!search) return base;
    return base.filter((p) => `${p.body} ${p.author?.display_name ?? ''} ${p.author?.username ?? ''}`.toLowerCase().includes(search));
  }, [posts, searchText, tab]);

  const requireLogin = () => {
    if (session || !supabase) return true;
    setShowAuth(true); setMessage('เข้าสู่ระบบก่อนเพื่อบันทึกการกระทำนี้ลงฐานข้อมูล'); return false;
  };

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setMessage('ขณะนี้เป็นโหมดตัวอย่าง เชื่อม Supabase ตามคู่มือก่อนจึงจะสมัครหรือเข้าสู่ระบบได้'); return; }
    if (!email.trim() || password.length < 8) { setMessage('กรอกอีเมลและรหัสผ่านอย่างน้อย 8 ตัวอักษร'); return; }
    setBusy(true); setMessage('');
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: email.split('@')[0] } } });
        if (error) throw error;
        setMessage('สมัครสมาชิกแล้ว หากเปิดยืนยันอีเมลไว้ ให้ตรวจอีเมลเพื่อยืนยันบัญชี');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setShowAuth(false); setPassword('');
      }
    } catch (err: any) { setMessage(err.message || 'เข้าสู่ระบบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  async function signInGoogle() {
    if (!supabase) { setMessage('ต้องเชื่อม Supabase และตั้งค่า Google Provider ก่อน'); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) setMessage(error.message);
  }

  async function signInFacebook() {
    if (!supabase) { setMessage('ต้องเชื่อม Supabase และตั้งค่า Facebook Provider ก่อน'); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin } });
    if (error) setMessage(error.message);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setProfile(null); setShowProfileEditor(false); setTab('home'); setMessage('ออกจากระบบแล้ว');
  }

  async function submitPost(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !selectedFile) { setMessage('พิมพ์ข้อความหรือเลือกไฟล์ก่อนโพสต์'); return; }
    if (body.length > 500) return;
    if (supabase && !session) { setShowAuth(true); setMessage('เข้าสู่ระบบก่อนโพสต์'); return; }
    setBusy(true); setMessage('');
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = selectedFile?.type || null;
      if (selectedFile && supabase && session) {
        if (selectedFile.size > 10 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 10 MB ในรุ่นเริ่มต้น');
        const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf'];
        if (!allowed.includes(selectedFile.type)) throw new Error('ชนิดไฟล์นี้ยังไม่รองรับในรุ่นเริ่มต้น');
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('post-media').upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });
        if (uploadError) throw uploadError;
        mediaUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      } else if (selectedFile) mediaUrl = URL.createObjectURL(selectedFile);
      if (!supabase) {
        const now = new Date().toISOString();
        const newPost: Post = { id: crypto.randomUUID(), user_id: 'demo-self', body, created_at: now, is_sensitive: sensitive, comments_enabled: commentsEnabled, visibility: 'public', media_url: mediaUrl, media_type: mediaType, quote_of: quoteTarget?.id ?? null, original: quoteTarget ?? undefined, author: { username: 'your_account', display_name: 'บัญชีตัวอย่าง' }, likesCount: 0, repostsCount: 0, commentsCount: 0 };
        setPosts((old) => [newPost, ...old]);
      } else {
        const { error } = await supabase.from('posts').insert({
          user_id: session!.user.id, body, visibility: 'public', is_sensitive: sensitive,
          comments_enabled: commentsEnabled, media_url: mediaUrl, media_type: mediaType,
          quote_of: quoteTarget?.id ?? null,
        });
        if (error) throw error;
        await loadFeed();
      }
      setDraft(''); setSelectedFile(null); setSensitive(false); setCommentsEnabled(true); setQuoteTarget(null); setMessage('โพสต์เรียบร้อยแล้ว');
    } catch (err: any) { setMessage(err.message || 'โพสต์ไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  async function toggleLike(post: Post) {
    const target = post.repost_of ? (post.original ?? post) : post;
    if (supabase && !requireLogin()) return;
    if (!supabase) {
      setPosts((old) => old.map((p) => p.id === target.id ? { ...p, liked: !p.liked, likesCount: Math.max(0, (p.likesCount ?? 0) + (p.liked ? -1 : 1)) } : p)); return;
    }
    const userId = session!.user.id;
    const result = target.liked
      ? await supabase.from('post_likes').delete().eq('post_id', target.id).eq('user_id', userId)
      : await supabase.from('post_likes').insert({ post_id: target.id, user_id: userId });
    if (result.error) setMessage(result.error.message); else await loadFeed();
  }

  async function toggleSave(post: Post) {
    const target = post.repost_of ? (post.original ?? post) : post;
    if (supabase && !requireLogin()) return;
    if (!supabase) { setPosts((old) => old.map((p) => p.id === target.id ? { ...p, saved: !p.saved } : p)); return; }
    const userId = session!.user.id;
    const result = target.saved
      ? await supabase.from('post_saves').delete().eq('post_id', target.id).eq('user_id', userId)
      : await supabase.from('post_saves').insert({ post_id: target.id, user_id: userId });
    if (result.error) setMessage(result.error.message); else await loadFeed();
  }

  async function toggleRepost(post: Post) {
    const target = post.repost_of ? (post.original ?? post) : post;
    if (supabase && !requireLogin()) return;
    if (!supabase) {
      if (target.reposted) { setPosts((old) => old.filter((p) => !(p.user_id === 'demo-self' && p.repost_of === target.id))); setPosts((old) => old.map((p) => p.id === target.id ? { ...p, reposted: false, repostsCount: Math.max(0, (p.repostsCount ?? 0) - 1) } : p)); }
      else {
        const repost: Post = { ...target, id: crypto.randomUUID(), user_id: 'demo-self', body: '', created_at: new Date().toISOString(), repost_of: target.id, author: { username: 'your_account', display_name: 'บัญชีตัวอย่าง' }, original: target };
        setPosts((old) => [repost, ...old.map((p) => p.id === target.id ? { ...p, reposted: true, repostsCount: (p.repostsCount ?? 0) + 1 } : p)]);
      }
      return;
    }
    const userId = session!.user.id;
    let result;
    if (target.reposted) result = await supabase.from('posts').delete().eq('user_id', userId).eq('repost_of', target.id);
    else result = await supabase.from('posts').insert({ user_id: userId, body: '', visibility: 'public', is_sensitive: false, comments_enabled: false, repost_of: target.id });
    if (result.error) setMessage(result.error.message); else await loadFeed();
  }

  async function toggleComments(post: Post) {
    const target = post.repost_of ? (post.original ?? post) : post;
    const nextOpen = !commentOpen[target.id];
    setCommentOpen((old) => ({ ...old, [target.id]: nextOpen }));
    if (nextOpen && !commentLists[target.id] && supabase) {
      const { data, error } = await supabase.from('comments').select('id,body,created_at,user_id,author:profiles!comments_user_id_fkey(username,display_name,avatar_url)').eq('post_id', target.id).order('created_at', { ascending: true }).limit(100);
      if (error) setMessage(error.message); else setCommentLists((old) => ({ ...old, [target.id]: (data ?? []) as Comment[] }));
    }
  }

  async function submitComment(post: Post) {
    const target = post.repost_of ? (post.original ?? post) : post;
    const body = (commentDrafts[target.id] ?? '').trim();
    if (!body) return;
    if (supabase && !requireLogin()) return;
    if (!supabase) {
      const comment: Comment = { id: crypto.randomUUID(), body, created_at: new Date().toISOString(), user_id: 'demo-self', author: { username: 'your_account', display_name: 'บัญชีตัวอย่าง' } };
      setCommentLists((old) => ({ ...old, [target.id]: [...(old[target.id] ?? []), comment] }));
      setPosts((old) => old.map((p) => p.id === target.id ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p));
    } else {
      const { error } = await supabase.from('comments').insert({ post_id: target.id, user_id: session!.user.id, body });
      if (error) { setMessage(error.message); return; }
      const { data } = await supabase.from('comments').select('id,body,created_at,user_id,author:profiles!comments_user_id_fkey(username,display_name,avatar_url)').eq('post_id', target.id).order('created_at', { ascending: true }).limit(100);
      setCommentLists((old) => ({ ...old, [target.id]: (data ?? []) as Comment[] }));
      await loadFeed();
    }
    setCommentDrafts((old) => ({ ...old, [target.id]: '' }));
  }

  function editProfile() {
    setProfileDraft({ username: profile?.username ?? '', display_name: profile?.display_name ?? '', bio: profile?.bio ?? '', avatar_url: profile?.avatar_url ?? '', cover_url: profile?.cover_url ?? '' });
    setShowProfileEditor(true);
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session) { setMessage('โปรไฟล์ในโหมดตัวอย่างจะไม่ถูกบันทึกข้ามอุปกรณ์'); setShowProfileEditor(false); return; }
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ username: profileDraft.username.trim(), display_name: profileDraft.display_name.trim(), bio: profileDraft.bio.trim(), avatar_url: profileDraft.avatar_url.trim() || null, cover_url: profileDraft.cover_url.trim() || null, updated_at: new Date().toISOString() }).eq('id', session.user.id);
    if (error) setMessage(error.message);
    else { setProfile({ ...profileDraft, id: session.user.id }); setMessage('บันทึกโปรไฟล์แล้ว'); setShowProfileEditor(false); }
    setBusy(false);
  }

  const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'หน้าฟีด', icon: Home }, { id: 'explore', label: 'สำรวจ', icon: Compass },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell }, { id: 'messages', label: 'ข้อความ', icon: MessageSquare },
    { id: 'communities', label: 'คอมมูนิตี้', icon: Users }, { id: 'saved', label: 'รายการโปรด', icon: Bookmark },
    { id: 'profile', label: 'โปรไฟล์', icon: UserRound },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => { setTab('home'); setMobileMenu(false); }} aria-label="BCVENT หน้าฟีด">
          <FlowerMark /><span>BCVENT</span>
        </button>
        <nav className="nav-list">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setMobileMenu(false); }}>
              <Icon size={21} strokeWidth={1.8} /><span>{label}</span>
              {id === 'notifications' && notificationBadge > 0 && <span className="nav-count">{notificationBadge}</span>}
            </button>
          ))}
        </nav>
        <button className="primary-button sidebar-compose" onClick={() => { document.getElementById('post-draft')?.focus(); setTab('home'); }}><Plus size={19} /> เขียนโพสต์</button>
        <div className="sidebar-bottom">
          <button className="account-mini" onClick={() => session ? editProfile() : setShowAuth(true)}>
            <Avatar profile={profile ?? DEMO_AUTHOR} size="md" /><span className="account-info"><b>{profile?.display_name ?? 'โหมดตัวอย่าง'}</b><small>@{profile?.username ?? 'your_account'}</small></span><ChevronDown size={16} />
          </button>
          {session ? <button className="secondary-button switch-account" onClick={() => { void signOut(); setShowAuth(true); }}><Repeat2 size={16} /> สลับบัญชี / ออกจากระบบ</button> : <button className="secondary-button switch-account" onClick={() => setShowAuth(true)}><LogIn size={16} /> เข้าสู่ระบบ</button>}
          <div className="build-caption">BCVENT · Preview 0.1</div>
        </div>
      </aside>

      <main className="main-column">
        <header className="mobile-topbar">
          <button className="icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="เปิดเมนู"><Menu size={21} /></button>
          <button className="brand compact" onClick={() => setTab('home')}><FlowerMark /><span>BCVENT</span></button>
          <button className="icon-button" onClick={() => setShowAuth(true)} aria-label="บัญชี"><UserRound size={21} /></button>
        </header>
        <div className="search-bar">
          <Search size={19} /><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="ค้นหาใน BCVENT..." aria-label="ค้นหาใน BCVENT" />
          <button className="icon-button subtle" title="ตั้งค่า" onClick={() => setMessage('การตั้งค่าขั้นสูงจะเพิ่มในรุ่นถัดไป')}><Settings2 size={18} /></button>
        </div>

        {tab === 'home' && <>
          <div className="feed-tabs">
            <button className={feedMode === 'for-you' ? 'selected' : ''} onClick={() => setFeedMode('for-you')}>สำหรับคุณ</button>
            <button className={feedMode === 'following' ? 'selected' : ''} onClick={() => setFeedMode('following')}>กำลังติดตาม</button>
          </div>
          <form className="composer" onSubmit={submitPost}>
            <Avatar profile={profile ?? { username: 'you', display_name: 'คุณ' }} size="lg" />
            <div className="composer-main">
              {quoteTarget && <div className="quote-notice"><Quote size={15} /> โควตโพสต์ของ @{quoteTarget.author?.username ?? 'สมาชิก'} <button type="button" onClick={() => setQuoteTarget(null)} aria-label="ยกเลิกโควต"><X size={15} /></button></div>}
              <textarea id="post-draft" value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} placeholder="มีอะไรอยากบอกไหม?" rows={3} />
              {selectedFile && <div className="file-chip"><Paperclip size={15} /><span>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} aria-label="เอาไฟล์ออก"><X size={15} /></button></div>}
              <div className="composer-footer"><div className="composer-tools">
                <label className="tool-button" title="แนบภาพ วิดีโอ หรือ PDF"><ImageIcon size={19} /><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} /></label>
                <button type="button" className={`tool-button ${sensitive ? 'tool-active' : ''}`} title="โพสต์เซนซิทีฟ" onClick={() => setSensitive(!sensitive)}>{sensitive ? <EyeOff size={19} /> : <ShieldAlert size={19} />}</button>
                <button type="button" className={`tool-button ${commentsEnabled ? '' : 'tool-active'}`} title={commentsEnabled ? 'ปิดคอมเมนต์' : 'เปิดคอมเมนต์'} onClick={() => setCommentsEnabled(!commentsEnabled)}><MessageCircle size={19} />{!commentsEnabled && <X size={10} className="mini-x" />}</button>
                <span className="char-count" style={{ color: draft.length > 470 ? 'var(--warning)' : undefined }}>{draft.length}/500</span>
              </div><button className="primary-button post-button" type="submit" disabled={busy || draft.length > 500}>{busy ? 'กำลังโพสต์…' : 'โพสต์'}</button></div>
              {(sensitive || !commentsEnabled) && <div className="composer-options">{sensitive && <span><ShieldAlert size={13} /> ซ่อนเนื้อหาไว้จนกว่าจะกดเปิดดู</span>}{!commentsEnabled && <span><MessageCircle size={13} /> ปิดคอมเมนต์</span>}</div>}
            </div>
          </form>
          {message && <div className="notice-bar"><span>{message}</span><button onClick={() => setMessage('')} aria-label="ปิดข้อความ"><X size={16} /></button></div>}
          {loading ? <div className="loading-state"><span className="spinner" />กำลังโหลดฟีด…</div> : visiblePosts.length ? <div className="post-list">{visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUserId={session?.user.id} revealed={Boolean(revealed[post.id])} onReveal={() => setRevealed((old) => ({ ...old, [post.id]: true }))} commentOpen={Boolean(commentOpen[post.repost_of || post.id])} comments={commentLists[post.repost_of || post.id] ?? []} commentDraft={commentDrafts[post.repost_of || post.id] ?? ''} onCommentDraft={(value) => setCommentDrafts((old) => ({ ...old, [post.repost_of || post.id]: value }))} onLike={() => void toggleLike(post)} onRepost={() => void toggleRepost(post)} onSave={() => void toggleSave(post)} onQuote={() => { setQuoteTarget(post.repost_of ? (post.original ?? post) : post); setTab('home'); document.getElementById('post-draft')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onToggleComments={() => void toggleComments(post)} onSubmitComment={() => void submitComment(post)} onAuthorClick={() => { if (profile && post.user_id === profile.id) setTab('profile'); else setMessage(`โปรไฟล์ @${post.author?.username ?? 'สมาชิก'}: การดูโปรไฟล์สมาชิกจะเพิ่มในรุ่นถัดไป`); }} />)}</div> : <EmptyState title="ยังไม่มีโพสต์ที่ตรงกัน" body="ลองค้นหาคำอื่น หรือเปลี่ยนแท็บฟีด" />}
        </>}

        {tab === 'explore' && <SectionPage icon={<Compass size={25} />} title="สำรวจ BCVENT" subtitle="ค้นหาเรื่องราวใหม่ ๆ และบทสนทนาที่คุณอาจสนใจ"><div className="explore-chips"><button onClick={() => setSearchText('คาเฟ่')}>คาเฟ่</button><button onClick={() => setSearchText('โปรเจกต์')}>โปรเจกต์</button><button onClick={() => setSearchText('BCVENT')}>BCVENT</button><button onClick={() => { setSearchText(''); setTab('home'); }}>ล้างการค้นหา</button></div><p className="muted-copy">ขณะนี้การค้นหาจะกรองโพสต์ที่โหลดอยู่ ฟังก์ชันค้นหาทั้งระบบและเทรนด์เรียลไทม์จะพัฒนาในระยะถัดไป</p><button className="secondary-button" onClick={() => { setTab('home'); setSearchText(''); }}>กลับไปหน้าฟีด</button></SectionPage>}
        {tab === 'notifications' && <SectionPage icon={<Bell size={25} />} title="การแจ้งเตือน" subtitle="ไลก์ คอมเมนต์ รีโพสต์ โควต และกิจกรรมที่เกี่ยวกับคุณ">{supabase && session ? <div className="notification-list">{notifications.length ? notifications.map((n) => <div className="notification-row" key={n.id}><Avatar profile={n.actor ?? DEMO_AUTHOR} size="md" /><div><b>{n.actor?.display_name ?? 'สมาชิก BCVENT'}</b> {notificationLabel(n.kind)}<small>{timeAgo(n.created_at)}</small></div>{n.post_id && <button className="icon-button" onClick={() => setTab('home')} title="ไปยังฟีด"><ChevronDown size={17} /></button>}</div>) : <EmptyState title="ยังไม่มีการแจ้งเตือน" body="เมื่อมีคนโต้ตอบกับโพสต์ของคุณ การแจ้งเตือนจะแสดงที่นี่" />}</div> : <EmptyState title="เข้าสู่ระบบเพื่อดูการแจ้งเตือน" body="รุ่นตัวอย่างนี้ยังไม่มีการแจ้งเตือนจริงจนกว่าจะเชื่อม Supabase" action={<button className="primary-button" onClick={() => setShowAuth(true)}>เข้าสู่ระบบ</button>} />}</SectionPage>}
        {tab === 'saved' && <><SectionPage icon={<Bookmark size={25} />} title="รายการโปรด" subtitle="บันทึกโพสต์ที่อยากกลับมาอ่านอีกครั้ง" />{visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUserId={session?.user.id} revealed={Boolean(revealed[post.id])} onReveal={() => setRevealed((old) => ({ ...old, [post.id]: true }))} commentOpen={false} comments={[]} commentDraft="" onCommentDraft={() => {}} onLike={() => void toggleLike(post)} onRepost={() => void toggleRepost(post)} onSave={() => void toggleSave(post)} onQuote={() => setQuoteTarget(post)} onToggleComments={() => void toggleComments(post)} onSubmitComment={() => void submitComment(post)} onAuthorClick={() => setTab('profile')} />) : <EmptyState title="ยังไม่มีโพสต์ที่บันทึก" body={supabase ? 'กดไอคอนบันทึกบนโพสต์เพื่อเก็บไว้ที่นี่' : 'โหมดตัวอย่างไม่เก็บรายการโปรดข้ามการรีโหลด'} />}</>}
        {tab === 'profile' && <>
          <div className="profile-cover" style={profile?.cover_url ? { backgroundImage: `linear-gradient(180deg, transparent, #07101e), url(${profile.cover_url})` } : undefined}><div className="cover-overlay"><span>โปรไฟล์</span>{session && <button className="secondary-button" onClick={editProfile}><Settings2 size={16} /> แก้ไขโปรไฟล์</button>}</div></div>
          <div className="profile-summary"><Avatar profile={profile ?? { username: 'your_account', display_name: 'บัญชีตัวอย่าง', avatar_url: null }} size="xl" /><div className="profile-title"><h2>{profile?.display_name ?? 'บัญชีตัวอย่าง'}</h2><span>@{profile?.username ?? 'your_account'}</span><p>{profile?.bio || 'พื้นที่ของคุณสำหรับแบ่งปันเรื่องราว'}</p><small>{session ? session.user.email : 'โหมดแสดงตัวอย่าง'}</small></div>{!session && <button className="primary-button" onClick={() => setShowAuth(true)}>เชื่อมบัญชี</button>}</div>
          <div className="feed-tabs"><button className="selected">โพสต์</button><button onClick={() => setMessage('แท็บสื่อและการตอบกลับจะเพิ่มในรุ่นถัดไป')}>สื่อและการตอบกลับ</button></div>
          {visiblePosts.filter((p) => !session || p.user_id === session.user.id).length ? visiblePosts.filter((p) => !session || p.user_id === session.user.id).map((post) => <PostCard key={post.id} post={post} currentUserId={session?.user.id} revealed={Boolean(revealed[post.id])} onReveal={() => setRevealed((old) => ({ ...old, [post.id]: true }))} commentOpen={Boolean(commentOpen[post.id])} comments={commentLists[post.id] ?? []} commentDraft={commentDrafts[post.id] ?? ''} onCommentDraft={(value) => setCommentDrafts((old) => ({ ...old, [post.id]: value }))} onLike={() => void toggleLike(post)} onRepost={() => void toggleRepost(post)} onSave={() => void toggleSave(post)} onQuote={() => setQuoteTarget(post)} onToggleComments={() => void toggleComments(post)} onSubmitComment={() => void submitComment(post)} onAuthorClick={() => {}} />) : <EmptyState title="ยังไม่มีโพสต์ของคุณ" body="โพสต์แรกของคุณจะปรากฏบนหน้าโปรไฟล์นี้" />}
        </>}
        {tab === 'messages' && <FeaturePlaceholder icon={<MessageSquare size={27} />} title="ข้อความส่วนตัว" body="โครงสร้างฐานข้อมูลห้องแชทและสมาชิกเตรียมไว้ใน Supabase แล้ว รุ่นเริ่มต้นยังไม่ได้เปิดหน้าส่งข้อความแบบเรียลไทม์ จึงยังไม่ควรใช้ส่งข้อมูลส่วนตัว" items={['แชทส่วนตัวและกลุ่มสูงสุด 200 คน', 'ส่งรูป วิดีโอ และไฟล์', 'เปลี่ยนชื่อกลุ่ม จัดการสมาชิก และนำสมาชิกออก']} />}
        {tab === 'communities' && <FeaturePlaceholder icon={<Users size={27} />} title="คอมมูนิตี้" body="วางโครงสร้างกลุ่มสาธารณะ/ส่วนตัว บทบาท owner, admin และ moderator ไว้ในฐานข้อมูลแล้ว แต่ยังต้องสร้างหน้าจัดการและทดสอบสิทธิ์ก่อนเปิดใช้จริง" items={['สร้างและค้นหาคอมมูนิตี้', 'จัดการสมาชิกและผู้ดูแล', 'โพลและโพสต์เฉพาะชุมชน']} />}
        <footer className="mobile-footer-note">BCVENT Preview · สร้างเพื่อทดลองใช้งาน</footer>
      </main>

      <aside className="right-rail">
        <section className="rail-card"><div className="rail-heading"><h3>กำลังเป็นที่นิยม</h3><button className="icon-button subtle" title="เกี่ยวกับเทรนด์" onClick={() => setMessage('เทรนด์ในรุ่นนี้เป็นตัวอย่าง; จะเชื่อมกับจำนวนโพสต์จริงภายหลัง')}><CircleHelp size={16} /></button></div>
          {[['#ชีวิตมหาลัย','ความนิยม 182K โพสต์'],['#ท้องฟ้าวันนี้','ความนิยม 96.4K โพสต์'],['#อ่านหนังสือ','ความนิยม 78.2K โพสต์'],['#คาเฟ่กรุงเทพ','ความนิยม 62.7K โพสต์'],['#เพลงใหม่','ความนิยม 51.9K โพสต์']].map(([tag, desc], i) => <button className="trend-row" key={tag} onClick={() => { setSearchText(tag.slice(1)); setTab('home'); }}><span className="trend-rank">{i + 1}</span><span><b>{tag}</b><small>{desc}</small></span><MoreHorizontal size={17} /></button>)}
        </section>
        <section className="rail-card"><div className="rail-heading"><h3>แนะนำสำหรับคุณ</h3><button className="text-link" onClick={() => setMessage('ระบบแนะนำสมาชิกจะเปิดใช้หลังเพิ่มระบบติดตาม')}>ดูทั้งหมด</button></div>
          {[{ username: 'pimchanok', display_name: 'พิมพ์ชนก' }, { username: 'tiwa_qq', display_name: 'ทิวา' }, { username: 'kant.k', display_name: 'กานต์' }].map((u) => <div className="suggest-row" key={u.username}><Avatar profile={u} size="md" /><span className="suggest-info"><b>{u.display_name}</b><small>@{u.username}</small></span><button className="follow-button" onClick={() => { if (!session && supabase) setShowAuth(true); else setMessage('ระบบติดตามสมาชิกจะเพิ่มในรุ่นถัดไป'); }}>ติดตาม</button></div>)}
        </section>
        <section className="rail-card community-card"><div className="rail-heading"><h3>ชุมชนแนะนำ</h3><button className="text-link" onClick={() => setTab('communities')}>ดูทั้งหมด</button></div>
          <div className="community-row"><div className="community-icon"><BookMarkIcon /></div><div><b>สายนักหนังสือ</b><small>สมาชิก 12.4K คน</small></div><button className="join-button" onClick={() => setTab('communities')}>เข้าร่วม</button></div>
          <div className="community-row"><div className="community-icon coffee-icon"><Sparkles size={20} /></div><div><b>ถ่ายรูป & คาเฟ่</b><small>สมาชิก 8.7K คน</small></div><button className="join-button" onClick={() => setTab('communities')}>เข้าร่วม</button></div>
        </section>
        <div className="rail-footnote">เกี่ยวกับ · กติกาชุมชน · ความเป็นส่วนตัว<br />© 2026 BCVENT · Preview</div>
      </aside>

      <nav className="mobile-nav">{navItems.filter((n) => ['home','explore','notifications','messages','profile'].includes(n.id)).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)} aria-label={label}><Icon size={21} />{id === 'notifications' && notificationBadge > 0 && <span className="mobile-dot" />}</button>)}</nav>

      {showAuth && <Modal title={authMode === 'signin' ? 'เข้าสู่ระบบ BCVENT' : 'สร้างบัญชี BCVENT'} onClose={() => setShowAuth(false)}><p className="modal-subtitle">เข้าร่วมพื้นที่แบ่งปันเรื่องราวของคุณ</p><form className="auth-form" onSubmit={handleAuth}><label>อีเมล<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></label><label>รหัสผ่าน<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} /></label><button className="primary-button full-width" disabled={busy} type="submit">{busy ? 'กำลังดำเนินการ…' : authMode === 'signin' ? 'เข้าสู่ระบบด้วยอีเมล' : 'สมัครสมาชิก'}</button></form><div className="auth-separator"><span>หรือ</span></div><button className="secondary-button full-width" onClick={() => void signInGoogle()}><GoogleGlyph /> ดำเนินการต่อด้วย Google</button><button className="secondary-button full-width social-facebook" onClick={() => void signInFacebook()}><FacebookGlyph /> ดำเนินการต่อด้วย Facebook</button><p className="auth-switch">{authMode === 'signin' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'} <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>{authMode === 'signin' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button></p>{!isSupabaseConfigured && <div className="inline-warning"><ShieldAlert size={16} /> ตอนนี้เป็นโหมดสาธิต การสมัครและบันทึกลงฐานข้อมูลจะทำงานหลังตั้งค่า Supabase ตามคู่มือ</div>}{message && <div className="notice-bar compact-notice"><span>{message}</span><button onClick={() => setMessage('')} aria-label="ปิด"><X size={15} /></button></div>}</Modal>}
      {showProfileEditor && <Modal title="แก้ไขโปรไฟล์" onClose={() => setShowProfileEditor(false)}><form className="auth-form" onSubmit={saveProfile}><label>Username<input value={profileDraft.username} onChange={(e) => setProfileDraft({ ...profileDraft, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) })} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" /></label><small className="field-help">ใช้ตัวอักษรอังกฤษ ตัวเลข และ _ จำนวน 3–24 ตัว</small><label>ชื่อที่แสดง<input value={profileDraft.display_name} onChange={(e) => setProfileDraft({ ...profileDraft, display_name: e.target.value.slice(0, 60) })} required maxLength={60} /></label><label>แนะนำตัว<textarea value={profileDraft.bio} onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value.slice(0, 160) })} maxLength={160} rows={3} /></label><label>ลิงก์รูปโปรไฟล์<input type="url" value={profileDraft.avatar_url} onChange={(e) => setProfileDraft({ ...profileDraft, avatar_url: e.target.value })} placeholder="https://..." /></label><label>ลิงก์รูปปก<input type="url" value={profileDraft.cover_url} onChange={(e) => setProfileDraft({ ...profileDraft, cover_url: e.target.value })} placeholder="https://..." /></label><button className="primary-button full-width" type="submit" disabled={busy}>บันทึกโปรไฟล์</button></form></Modal>}
    </div>
  );
}

function FlowerMark() {
  return <span className="flower-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><g fill="currentColor"><ellipse cx="20" cy="10" rx="5.8" ry="8.4"/><ellipse cx="30" cy="20" rx="8.4" ry="5.8"/><ellipse cx="20" cy="30" rx="5.8" ry="8.4"/><ellipse cx="10" cy="20" rx="8.4" ry="5.8"/></g><circle cx="20" cy="20" r="2.8" fill="#07152e"/></svg></span>;
}
function Avatar({ profile, size = 'md' }: { profile?: Profile; size?: 'sm'|'md'|'lg'|'xl' }) {
  if (profile?.avatar_url) return <img className={`avatar avatar-${size}`} src={profile.avatar_url} alt={profile.display_name || profile.username} />;
  return <span className={`avatar avatar-${size} avatar-fallback`}>{initials(profile)}</span>;
}
function ActionButton({ icon, label, count, active, onClick, title }: { icon: ReactNode; label: string; count?: number; active?: boolean; onClick: () => void; title: string }) {
  return <button className={`action-button ${active ? 'action-active' : ''}`} onClick={onClick} title={title} aria-label={title}>{icon}<span>{count ?? ''}</span><span className="sr-only">{label}</span></button>;
}
function PostCard(props: {
  post: Post; currentUserId?: string; revealed: boolean; onReveal: () => void; commentOpen: boolean; comments: Comment[]; commentDraft: string;
  onCommentDraft: (value: string) => void; onLike: () => void; onRepost: () => void; onSave: () => void; onQuote: () => void;
  onToggleComments: () => void; onSubmitComment: () => void; onAuthorClick: () => void;
}) {
  const { post, revealed, onReveal } = props;
  const isRepost = Boolean(post.repost_of);
  const content = isRepost && post.original ? post.original : post;
  const displayProfile = post.author ?? DEMO_AUTHOR;
  const [moreOpen, setMoreOpen] = useState(false);
  return <article className="post-card">
    {isRepost && <div className="repost-label"><Repeat2 size={14} /> {displayProfile.display_name} รีโพสต์</div>}
    <div className="post-row"><button className="avatar-button" onClick={props.onAuthorClick}><Avatar profile={displayProfile} size="lg" /></button><div className="post-content">
      <div className="post-meta"><button className="name-button" onClick={props.onAuthorClick}>{displayProfile.display_name}</button><span className="handle">@{displayProfile.username}</span><span className="meta-dot">·</span><span className="time-text">{timeAgo(post.created_at)}</span><div className="post-menu-wrap"><button className="icon-button subtle" onClick={() => setMoreOpen(!moreOpen)} aria-label="ตัวเลือกโพสต์"><MoreHorizontal size={19} /></button>{moreOpen && <div className="post-menu"><button onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/?post=${post.id}`); setMoreOpen(false); }}>คัดลอกลิงก์โพสต์</button><button onClick={() => { setMoreOpen(false); }}>ปิดเมนู</button></div>}</div></div>
      {post.is_sensitive && !revealed ? <button className="sensitive-cover" onClick={onReveal}><EyeOff size={22} /><b>เนื้อหาที่ละเอียดอ่อน</b><span>แตะเพื่อดูโพสต์นี้</span></button> : <>
        {post.body && <p className="post-body">{post.body}</p>}
        {post.media_url && <div className="post-media">{post.media_type?.startsWith('image/') ? <img src={post.media_url} alt="สื่อประกอบโพสต์" loading="lazy" /> : post.media_type?.startsWith('video/') ? <video src={post.media_url} controls playsInline /> : <a href={post.media_url} target="_blank" rel="noreferrer"><FileText size={23} /> เปิดไฟล์แนบ</a>}</div>}
        {post.quote_of && post.original && <QuotedPost post={post.original} />}
        {isRepost && post.original && <QuotedPost post={post.original} />}
      </>}
      <div className="post-actions">
        <ActionButton icon={<MessageCircle size={18} />} label="คอมเมนต์" count={content.commentsCount} onClick={() => content.comments_enabled && props.onToggleComments()} title={content.comments_enabled ? 'แสดงคอมเมนต์ใต้โพสต์' : 'เจ้าของโพสต์ปิดคอมเมนต์แล้ว'} active={props.commentOpen} />
        <ActionButton icon={<Repeat2 size={18} />} label="รีโพสต์" count={content.repostsCount} onClick={props.onRepost} title="รีโพสต์" active={content.reposted} />
        <ActionButton icon={<Heart size={18} fill={content.liked ? 'currentColor' : 'none'} />} label="ถูกใจ" count={content.likesCount} onClick={props.onLike} title="ถูกใจโพสต์" active={content.liked} />
        <ActionButton icon={<Quote size={18} />} label="โควต" onClick={props.onQuote} title="โควตโพสต์" />
        <ActionButton icon={<Bookmark size={18} fill={content.saved ? 'currentColor' : 'none'} />} label="บันทึก" onClick={props.onSave} title="บันทึกเป็นรายการโปรด" active={content.saved} />
      </div>
      {props.commentOpen && content.comments_enabled && <div className="comments-panel"><div className="comments-heading">ความคิดเห็น <span>{content.commentsCount ?? props.comments.length}</span></div>{props.comments.map((comment) => <div className="comment-row" key={comment.id}><Avatar profile={comment.author} size="sm" /><div><b>{comment.author?.display_name ?? 'สมาชิก BCVENT'}</b><span className="handle"> @{comment.author?.username ?? 'member'} · {timeAgo(comment.created_at)}</span><p>{comment.body}</p></div></div>)}<form className="comment-form" onSubmit={(e) => { e.preventDefault(); props.onSubmitComment(); }}><input value={props.commentDraft} onChange={(e) => props.onCommentDraft(e.target.value)} maxLength={500} placeholder="เขียนความคิดเห็น…" /><button type="submit" disabled={!props.commentDraft.trim()} aria-label="ส่งความคิดเห็น"><Send size={17} /></button></form></div>}
    </div></div>
  </article>;
}
function QuotedPost({ post }: { post: Post }) {
  return <div className="quoted-post"><div className="quoted-meta"><Avatar profile={post.author} size="sm" /><b>{post.author?.display_name ?? 'สมาชิก BCVENT'}</b><span>@{post.author?.username ?? 'member'}</span></div><p>{post.is_sensitive ? 'โพสต์นี้มีเนื้อหาที่ละเอียดอ่อน' : (post.body || 'โพสต์ที่แชร์')}</p>{post.media_url && <div className="quoted-media"><ImageIcon size={16} /> มีสื่อแนบ</div>}</div>;
}
function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><FlowerMark /></div><h3>{title}</h3><p>{body}</p>{action}</div>; }
function SectionPage({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children?: ReactNode }) { return <section className="section-page"><div className="section-icon">{icon}</div><h1>{title}</h1><p>{subtitle}</p>{children}</section>; }
function FeaturePlaceholder({ icon, title, body, items }: { icon: ReactNode; title: string; body: string; items: string[] }) { return <div className="feature-placeholder"><SectionPage icon={icon} title={title} subtitle={body} /><div className="roadmap-card"><h3>ฟีเจอร์ที่ออกแบบไว้</h3>{items.map((item) => <div className="roadmap-row" key={item}><Check size={16} />{item}</div>)}<p>ส่วนนี้เป็นโครงร่าง ไม่ใช่ฟีเจอร์ที่เปิดใช้งานสมบูรณ์ ต้องพัฒนา UI, เชื่อม Realtime และทดสอบสิทธิ์ก่อนใช้งานจริง</p></div></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><FlowerMark /><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="ปิดหน้าต่าง"><X size={19} /></button></div>{children}</section></div>; }
function notificationLabel(kind: string) { const labels: Record<string, string> = { like: 'ถูกใจโพสต์ของคุณ', comment: 'แสดงความคิดเห็นในโพสต์ของคุณ', repost: 'รีโพสต์โพสต์ของคุณ', quote: 'โควตโพสต์ของคุณ', follow: 'เริ่มติดตามคุณ', message: 'ส่งข้อความถึงคุณ', community: 'มีกิจกรรมในคอมมูนิตี้ของคุณ' }; return labels[kind] ?? 'มีความเคลื่อนไหวใหม่'; }
function BookMarkIcon() { return <Bookmark size={20} />; }
function GoogleGlyph() { return <span className="google-glyph" aria-hidden="true">G</span>; }
function FacebookGlyph() { return <span className="facebook-glyph" aria-hidden="true">f</span>; }
