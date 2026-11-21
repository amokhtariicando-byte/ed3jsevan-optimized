import { useCallback, useEffect, useState } from 'react';
import { Eye, Loader2, Rocket, RotateCcw } from 'lucide-react';
import { adminApi } from '../api';
import type {
  AdminItem,
  MenuState,
  PublishState,
} from '../types';
import { PageHeader } from '../components/PageHeader';
import { AlertDialog } from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { fa } from '../../lib/utils';

function formatPublishedAt(iso: string | null): string {
  if (!iso) return 'هنوز منتشر نشده است';
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** قیمت به‌صورت عدد خالی: قیمت تکی، یا ترکیب / عربیکا. */
function priceText(item: AdminItem): string {
  if (item.price != null) return fa(item.price);
  const parts = [item.priceBlend50, item.priceArabica100].filter(
    (p): p is number => p != null,
  );
  if (parts.length === 0) return '—';
  return parts.map((p) => fa(p)).join(' / ');
}

/** پیش‌نمایش پیش‌نویس منو (لیست ساده، مثل دید مشتری) + انتشار. */
export function PreviewPublishView() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<MenuState | null>(null);
  const [published, setPublished] = useState<MenuState | null>(null);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [menu, live, state] = await Promise.all([
        adminApi.getMenu(),
        adminApi.getPublishedMenu(),
        adminApi.getPublishState(),
      ]);
      setDraft(menu);
      setPublished(live);
      setPublishState(state);
    } catch {
      toast({ title: 'بارگذاری پیش‌نمایش ناموفق بود', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    setPublishing(true);
    try {
      const state = await adminApi.publish();
      setPublishState(state);
      const live = await adminApi.getPublishedMenu();
      setPublished(live);
      toast({ title: 'تغییرات منتشر شد', variant: 'success' });
    } catch {
      toast({ title: 'انتشار ناموفق بود', variant: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const discardDraft = async () => {
    setDiscarding(true);
    try {
      const menu = await adminApi.discardDraft();
      setDraft(menu);
      const state = await adminApi.getPublishState();
      setPublishState(state);
      toast({ title: 'پیش‌نویس به نسخه منتشرشده برگشت', variant: 'success' });
    } catch {
      toast({ title: 'بازگردانی پیش‌نویس ناموفق بود', variant: 'error' });
    } finally {
      setDiscarding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="پیش‌نمایش و انتشار"
          description="پیش‌نویس منو را مثل مشتری ببینید و بعد منتشر کنید."
        />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const categories = [...(draft?.categories ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const itemsByCategory = new Map<string, AdminItem[]>();
  for (const item of draft?.items ?? []) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }
  for (const list of itemsByCategory.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="پیش‌نمایش و انتشار"
        description="پیش‌نویس منو را مثل مشتری ببینید و بعد منتشر کنید."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-5" />
            انتشار
          </CardTitle>
          <CardDescription>
            {publishState?.hasDraft
              ? 'تغییرات منتشرنشده دارید؛ با انتشار، پیش‌نویس جای نسخه فعلی منو را می‌گیرد.'
              : 'پیش‌نویس و نسخه منتشرشده یکسان‌اند.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant={publishState?.hasDraft ? 'warning' : 'success'}>
              {publishState?.hasDraft
                ? 'پیش‌نویس منتشرنشده'
                : publishState?.lastPublishedAt
                  ? 'منتشر شده'
                  : 'بدون تغییر'}
            </Badge>
            <span className="text-muted-foreground">
              آخرین انتشار:{' '}
              {formatPublishedAt(publishState?.lastPublishedAt ?? null)}
            </span>
            {published && (
              <span className="text-muted-foreground">
                نسخه منتشرشده: {fa(published.items.length)} آیتم در{' '}
                {fa(published.categories.length)} دسته
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void publish()}
              disabled={!publishState?.hasDraft || publishing}
            >
              {publishing && <Loader2 className="size-4 animate-spin" />}
              انتشار تغییرات
            </Button>
            <Button
              variant="outline"
              onClick={() => setDiscardOpen(true)}
              disabled={!publishState?.hasDraft || discarding}
            >
              <RotateCcw className="size-4" />
              بازگردانی پیش‌نویس
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="بازگردانی پیش‌نویس؟"
        description="تغییرات منتشرنشده حذف و پیش‌نویس به نسخه منتشرشده برمی‌گردد."
        confirmText="بازگردانی"
        destructive
        onConfirm={() => discardDraft()}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-5" />
            پیش‌نمایش پیش‌نویس
          </CardTitle>
          <CardDescription>
            این همان چیزی است که مشتری پس از انتشار می‌بیند.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.length === 0 && (
            <EmptyState
              title="هنوز دسته‌ای وجود ندارد"
              description="از بخش دسته‌بندی‌ها یک دسته بسازید تا اینجا نمایش داده شود."
            />
          )}
          {categories.map((category) => {
            const items = itemsByCategory.get(category.id) ?? [];
            return (
              <section key={category.id}>
                <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
                  <h3 className="text-base font-bold text-foreground">
                    {category.name}
                  </h3>
                  {category.comingSoon && (
                    <Badge variant="warning">به‌زودی</Badge>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    این دسته هنوز آیتمی ندارد.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          {item.name}
                          {!item.available && (
                            <Badge variant="warning">ناموجود</Badge>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                          {priceText(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
