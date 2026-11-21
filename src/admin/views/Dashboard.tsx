import { useCallback, useEffect, useState } from 'react';
import {
  Eye,
  FolderTree,
  Loader2,
  Star,
  Tags,
  UtensilsCrossed,
} from 'lucide-react';
import { adminApi } from '../api';
import type { MenuState, PublishState } from '../types';
import { fa } from '../../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Stat } from '../../components/ui/stat';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { useToast } from '../../components/ui/toast';

function formatPublishedAt(iso: string | null): string {
  if (!iso) return 'هنوز منتشر نشده است';
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const QUICK_ACTIONS = [
  {
    href: '#/admin/items',
    label: 'مدیریت آیتم‌ها',
    icon: UtensilsCrossed,
  },
  { href: '#/admin/prices', label: 'تغییر گروهی قیمت', icon: Tags },
  { href: '#/admin/categories', label: 'دسته‌بندی‌ها', icon: FolderTree },
  { href: '#/admin/featured', label: 'پیشنهاد ویژه', icon: Star },
] as const;

export function DashboardView() {
  const { toast } = useToast();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [menuState, pubState] = await Promise.all([
        adminApi.getMenu(),
        adminApi.getPublishState(),
      ]);
      setMenu(menuState);
      setPublishState(pubState);
    } catch {
      toast({ title: 'بارگذاری داشبورد ناموفق بود', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (loading || !menu) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="داشبورد"
          description="نمای کلی منو و وضعیت انتشار"
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const unavailableCount = menu.items.filter((i) => !i.available).length;

  return (
    <div className="space-y-5">
      <PageHeader title="داشبورد" description="نمای کلی منو و وضعیت انتشار" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="آیتم‌ها" value={fa(menu.items.length)} />
        <Stat label="دسته‌بندی‌ها" value={fa(menu.categories.length)} />
        <Stat label="ناموجود" value={fa(unavailableCount)} />
        <Stat
          label="پیشنهاد ویژه"
          value={`${fa(menu.featured.length)} از ۳`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>وضعیت انتشار</CardTitle>
          <CardDescription>
            تغییرات شما اول در پیش‌نویس ذخیره می‌شوند؛ با انتشار، مشتری‌ها
            نسخه‌ی جدید را می‌بینند.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {publishState && (
              <Badge variant={publishState.hasDraft ? 'warning' : 'success'}>
                {publishState.hasDraft
                  ? 'پیش‌نویس منتشرنشده'
                  : publishState.lastPublishedAt
                    ? 'منتشر شده'
                    : 'بدون تغییر'}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              آخرین انتشار:{' '}
              {formatPublishedAt(publishState?.lastPublishedAt ?? null)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.hash = '#/admin/preview';
              }}
            >
              <Eye className="size-4" />
              پیش‌نمایش
            </Button>
            <Button
              disabled={!publishState?.hasDraft || publishing}
              onClick={() => void handlePublish()}
            >
              {publishing && <Loader2 className="size-4 animate-spin" />}
              انتشار تغییرات
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>دسترسی سریع</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              onClick={() => {
                window.location.hash = action.href;
              }}
            >
              <action.icon className="size-4" />
              {action.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
