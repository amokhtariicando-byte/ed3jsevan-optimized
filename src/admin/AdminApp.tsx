import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CupSoda,
  Eye,
  FolderTree,
  LayoutDashboard,
  Loader2,
  LogOut,
  QrCode,
  Settings,
  Star,
  Store,
  Tags,
  UtensilsCrossed,
} from 'lucide-react';
import { ToastProvider, useToast } from '../components/ui/toast';
import { Sidebar, SidebarGroup, SidebarItem } from '../components/ui/sidebar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert } from '../components/ui/alert';
import { PasswordInput } from '../components/ui/password-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { adminApi } from './api';
import type { PublishState } from './types';
const DashboardView = lazy(() =>
  import('./views/Dashboard').then((m) => ({ default: m.DashboardView })),
);
const ItemsView = lazy(() =>
  import('./views/Items').then((m) => ({ default: m.ItemsView })),
);
const ItemEditorView = lazy(() =>
  import('./views/ItemEditor').then((m) => ({ default: m.ItemEditorView })),
);
const BulkPricesView = lazy(() =>
  import('./views/BulkPrices').then((m) => ({ default: m.BulkPricesView })),
);
const CategoriesView = lazy(() =>
  import('./views/Categories').then((m) => ({ default: m.CategoriesView })),
);
const FeaturedView = lazy(() =>
  import('./views/Featured').then((m) => ({ default: m.FeaturedView })),
);
const SyrupsView = lazy(() =>
  import('./views/Syrups').then((m) => ({ default: m.SyrupsView })),
);
const CafeInfoView = lazy(() =>
  import('./views/CafeInfo').then((m) => ({ default: m.CafeInfoView })),
);
const QrCodeView = lazy(() =>
  import('./views/QrCode').then((m) => ({ default: m.QrCodeView })),
);
const PreviewPublishView = lazy(() =>
  import('./views/PreviewPublish').then((m) => ({
    default: m.PreviewPublishView,
  })),
);
const SettingsView = lazy(() =>
  import('./views/Settings').then((m) => ({ default: m.SettingsView })),
);

const SESSION_KEY = 'eyvan-admin-session';

type AdminRoute =
  | { name: 'dashboard' }
  | { name: 'items' }
  | { name: 'item'; id: string }
  | { name: 'prices' }
  | { name: 'categories' }
  | { name: 'featured' }
  | { name: 'syrups' }
  | { name: 'cafe' }
  | { name: 'qr' }
  | { name: 'preview' }
  | { name: 'settings' };

function parseRoute(hash: string): AdminRoute {
  const path = hash.replace(/^#\/admin/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'dashboard' };
  switch (parts[0]) {
    case 'items':
      return parts[1]
        ? { name: 'item', id: decodeURIComponent(parts[1]) }
        : { name: 'items' };
    case 'prices':
      return { name: 'prices' };
    case 'categories':
      return { name: 'categories' };
    case 'featured':
      return { name: 'featured' };
    case 'syrups':
      return { name: 'syrups' };
    case 'cafe':
      return { name: 'cafe' };
    case 'qr':
      return { name: 'qr' };
    case 'preview':
      return { name: 'preview' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'dashboard' };
  }
}

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'داشبورد',
  items: 'آیتم‌های منو',
  item: 'ویرایش آیتم',
  prices: 'تغییر گروهی قیمت',
  categories: 'دسته‌بندی‌ها',
  featured: 'پیشنهاد ویژه',
  syrups: 'سیروپ‌ها',
  cafe: 'اطلاعات کافه',
  qr: 'QR کد منو',
  preview: 'پیش‌نمایش و انتشار',
  settings: 'تنظیمات',
};

interface NavEntry {
  key: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { title: string; items: NavEntry[] }[] = [
  {
    title: 'کلی',
    items: [
      {
        key: 'dashboard',
        href: '#/admin',
        label: 'داشبورد',
        icon: LayoutDashboard,
      },
      {
        key: 'preview',
        href: '#/admin/preview',
        label: 'پیش‌نمایش و انتشار',
        icon: Eye,
      },
    ],
  },
  {
    title: 'منو',
    items: [
      {
        key: 'items',
        href: '#/admin/items',
        label: 'آیتم‌های منو',
        icon: UtensilsCrossed,
      },
      {
        key: 'prices',
        href: '#/admin/prices',
        label: 'تغییر گروهی قیمت',
        icon: Tags,
      },
      {
        key: 'categories',
        href: '#/admin/categories',
        label: 'دسته‌بندی‌ها',
        icon: FolderTree,
      },
      {
        key: 'featured',
        href: '#/admin/featured',
        label: 'پیشنهاد ویژه',
        icon: Star,
      },
      {
        key: 'syrups',
        href: '#/admin/syrups',
        label: 'سیروپ‌ها',
        icon: CupSoda,
      },
    ],
  },
  {
    title: 'کافه',
    items: [
      {
        key: 'cafe',
        href: '#/admin/cafe',
        label: 'اطلاعات کافه',
        icon: Store,
      },
      { key: 'qr', href: '#/admin/qr', label: 'QR کد منو', icon: QrCode },
      {
        key: 'settings',
        href: '#/admin/settings',
        label: 'تنظیمات',
        icon: Settings,
      },
    ],
  },
];

function routeKey(route: AdminRoute): string {
  return route.name === 'item' ? `item:${route.id}` : route.name;
}

function isNavActive(route: AdminRoute, key: string): boolean {
  if (key === 'items') return route.name === 'items' || route.name === 'item';
  return route.name === key;
}

function formatPublishedAt(iso: string | null): string {
  if (!iso) return 'هنوز منتشر نشده است';
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function LoginView({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (password.trim().length === 0) {
      setError('رمز را وارد کنید.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ok = await adminApi.login(password);
      if (ok) {
        window.sessionStorage.setItem(SESSION_KEY, '1');
        onLoggedIn();
      } else {
        setError('ورود ناموفق بود. دوباره تلاش کنید.');
      }
    } catch {
      setError('خطایی رخ داد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">پنل مدیریت ایوان</CardTitle>
          <CardDescription className="text-center">
            برای مدیریت منوی کافه وارد شوید
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="text-sm font-medium text-foreground"
            >
              رمز عبور
            </label>
            <PasswordInput
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
              placeholder="رمز عبور مدیر"
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            ورود
          </Button>
          <Alert variant="info">
            نسخه نمایشی — هر رمزی قبول می‌شود؛ ورود واقعی با بک‌اند PHP می‌آید.
          </Alert>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              window.location.hash = '';
            }}
          >
            <ArrowRight className="size-4" />
            بازگشت به منو
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminShell() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState<boolean>(
    () => window.sessionStorage.getItem(SESSION_KEY) === '1',
  );
  const [route, setRoute] = useState<AdminRoute>(() =>
    parseRoute(window.location.hash),
  );
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refreshPublish = useCallback(() => {
    void adminApi.getPublishState().then(setPublishState).catch(() => {
      /* keep the last known state */
    });
  }, []);

  useEffect(() => {
    if (!authed) return;
    refreshPublish();
    window.addEventListener('eyvan-admin-changed', refreshPublish);
    return () =>
      window.removeEventListener('eyvan-admin-changed', refreshPublish);
  }, [authed, refreshPublish]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const state = await adminApi.publish();
      setPublishState(state);
      toast({ title: 'تغییرات منتشر شد', variant: 'success' });
    } catch {
      toast({ title: 'انتشار ناموفق بود', variant: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    window.location.hash = '#/admin';
  };

  if (!authed) {
    return <LoginView onLoggedIn={() => setAuthed(true)} />;
  }

  const sidebarHeader = (
    <div>
      <p className="text-base font-bold text-foreground">ایوان</p>
      <p className="text-xs text-muted-foreground">پنل مدیریت منو</p>
    </div>
  );

  const sidebarFooter = (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={() => {
          window.location.hash = '';
        }}
      >
        <ArrowRight className="size-4" />
        مشاهده منو
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-destructive"
        onClick={logout}
      >
        <LogOut className="size-4" />
        خروج
      </Button>
    </div>
  );

  const allNav = NAV_GROUPS.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1280px] gap-6 p-4 md:p-6">
        {/* Desktop sidebar */}
        <div className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-6">
            <Sidebar header={sidebarHeader} footer={sidebarFooter}>
              {NAV_GROUPS.map((group) => (
                <SidebarGroup key={group.title} title={group.title}>
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.key}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={isNavActive(route, item.key)}
                    />
                  ))}
                </SidebarGroup>
              ))}
            </Sidebar>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* Top bar: section title + publish status */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold">
              {SECTION_TITLES[route.name] ?? 'پنل مدیریت'}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {publishState && (
                <Badge
                  variant={publishState.hasDraft ? 'warning' : 'success'}
                >
                  {publishState.hasDraft
                    ? 'پیش‌نویس منتشرنشده'
                    : publishState.lastPublishedAt
                      ? 'منتشر شده'
                      : 'بدون تغییر'}
                </Badge>
              )}
              {publishState?.lastPublishedAt && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  آخرین انتشار:{' '}
                  {formatPublishedAt(publishState.lastPublishedAt)}
                </span>
              )}
              <Button
                size="sm"
                disabled={!publishState?.hasDraft || publishing}
                onClick={() => void handlePublish()}
              >
                {publishing && <Loader2 className="size-4 animate-spin" />}
                انتشار
              </Button>
            </div>
          </div>

          {/* Mobile nav row */}
          <div className="eyvan-scroll-hidden -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
            {allNav.map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={isNavActive(route, item.key) ? 'default' : 'outline'}
                className="shrink-0"
                onClick={() => {
                  window.location.hash = item.href;
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            ))}
          </div>

          <main key={routeKey(route)}>
            <Suspense
              fallback={
                <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              }
            >
              {route.name === 'dashboard' && <DashboardView />}
              {route.name === 'items' && <ItemsView />}
              {route.name === 'item' && <ItemEditorView itemId={route.id} />}
              {route.name === 'prices' && <BulkPricesView />}
              {route.name === 'categories' && <CategoriesView />}
              {route.name === 'featured' && <FeaturedView />}
              {route.name === 'syrups' && <SyrupsView />}
              {route.name === 'cafe' && <CafeInfoView />}
              {route.name === 'qr' && <QrCodeView />}
              {route.name === 'preview' && <PreviewPublishView />}
              {route.name === 'settings' && <SettingsView />}
            </Suspense>
          </main>

          {/* Mobile footer actions */}
          <div className="mt-8 flex gap-2 md:hidden">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                window.location.hash = '';
              }}
            >
              <ArrowRight className="size-4" />
              مشاهده منو
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive"
              onClick={logout}
            >
              <LogOut className="size-4" />
              خروج
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminApp() {
  return (
    <ToastProvider position="bottom-start">
      <AdminShell />
    </ToastProvider>
  );
}
