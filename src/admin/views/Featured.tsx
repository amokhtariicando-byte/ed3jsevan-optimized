import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Star, X } from 'lucide-react';
import { adminApi } from '../api';
import type { AdminItem, MenuState } from '../types';
import { cn, fa } from '../../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../../components/ui/button';
import { SearchInput } from '../../components/ui/search-input';
import { SortableList } from '../../components/ui/sortable-list';
import { EmptyState } from '../../components/ui/empty-state';
import { Spinner } from '../../components/ui/spinner';
import { useToast } from '../../components/ui/toast';

/** The base price shown next to an item: single price, else the blend price. */
function basePrice(item: AdminItem): number | undefined {
  return item.price ?? item.priceBlend50 ?? item.priceArabica100;
}

function ItemThumb({
  item,
  className,
}: {
  item: AdminItem;
  className?: string;
}) {
  const src = item.frontImage || item.image;
  if (!src) {
    return (
      <div
        aria-hidden
        className={cn('shrink-0 rounded-lg bg-muted', className)}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={cn('shrink-0 rounded-lg object-cover', className)}
    />
  );
}

export function FeaturedView() {
  const { toast } = useToast();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setMenu(await adminApi.getMenu());
    } catch {
      toast({ title: 'بارگذاری منو ناموفق بود', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Picked items, in featured display order. */
  const picked = useMemo(() => {
    if (!menu) return [];
    const byId = new Map(menu.items.map((i) => [i.id, i] as const));
    return menu.featured
      .map((id) => byId.get(id))
      .filter((i): i is AdminItem => i !== undefined);
  }, [menu]);

  /** Up to 8 items matching the search that are not already picked. */
  const matches = useMemo(() => {
    if (!menu) return [];
    const q = query.trim();
    const pickedIds = new Set(menu.featured);
    return menu.items
      .filter(
        (item) =>
          !pickedIds.has(item.id) && (q === '' || item.name.includes(q)),
      )
      .slice(0, 8);
  }, [menu, query]);

  const isFull = (menu?.featured.length ?? 0) >= 3;

  const saveFeatured = async (ids: string[], successTitle: string) => {
    setMenu((prev) => (prev ? { ...prev, featured: ids } : prev));
    try {
      await adminApi.updateFeatured(ids);
      toast({ title: successTitle, variant: 'success' });
    } catch {
      toast({ title: 'ذخیره پیشنهاد ویژه ناموفق بود', variant: 'error' });
      await load();
    }
  };

  const add = (id: string) => {
    if (!menu || isFull) return;
    void saveFeatured([...menu.featured, id], 'به پیشنهاد ویژه اضافه شد');
  };

  const remove = (id: string) => {
    if (!menu) return;
    void saveFeatured(
      menu.featured.filter((f) => f !== id),
      'از پیشنهاد ویژه حذف شد',
    );
  };

  const handleReorder = (reordered: AdminItem[]) => {
    void saveFeatured(
      reordered.map((i) => i.id),
      'ترتیب پیشنهاد ویژه به‌روز شد',
    );
  };

  return (
    <div>
      <PageHeader
        title="پیشنهاد ویژه"
        description="تا ۳ آیتم برای کاروسل پیشنهاد ویژه انتخاب کنید."
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="در حال بارگذاری…" />
        </div>
      ) : !menu ? (
        <EmptyState
          title="منو بارگذاری نشد"
          description="دوباره تلاش کنید."
          action={
            <Button variant="outline" onClick={() => void load()}>
              تلاش دوباره
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Current picks */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              آیتم‌های انتخاب‌شده ({fa(picked.length)} از {fa(3)})
            </h3>
            {picked.length === 0 ? (
              <EmptyState
                icon={Star}
                title="هنوز آیتمی انتخاب نشده است"
                description="از بخش افزودن، تا ۳ آیتم را به‌عنوان پیشنهاد ویژه انتخاب کنید."
              />
            ) : (
              <SortableList
                items={picked}
                getKey={(i) => i.id}
                getLabel={(i) => i.name}
                label="ترتیب پیشنهاد ویژه"
                onReorder={handleReorder}
                renderItem={(item) => {
                  const price = basePrice(item);
                  return (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <ItemThumb item={item} className="size-12" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {price !== undefined ? fa(price) : '—'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`حذف ${item.name}`}
                        onClick={() => remove(item.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  );
                }}
              />
            )}
          </section>

          {/* Carousel preview */}
          {picked.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                پیش‌نمایش کاروسل پیشنهاد ویژه
              </h3>
              <div className="eyvan-scroll-hidden flex gap-3 overflow-x-auto pb-1">
                {picked.map((item) => {
                  const price = basePrice(item);
                  return (
                    <div
                      key={item.id}
                      className="w-36 shrink-0 rounded-xl border border-border bg-card p-3"
                    >
                      <ItemThumb item={item} className="h-24 w-full" />
                      <p className="mt-2 truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {price !== undefined ? fa(price) : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Add items */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              افزودن آیتم
            </h3>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="جست‌وجوی نام آیتم…"
            />
            {isFull && (
              <p className="text-sm text-muted-foreground">
                حداکثر ۳ آیتم؛ برای افزودن، اول یکی را حذف کنید.
              </p>
            )}
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {query.trim() === ''
                  ? 'آیتمی برای افزودن نیست.'
                  : 'آیتمی پیدا نشد.'}
              </p>
            ) : (
              <div className="space-y-2">
                {matches.map((item) => {
                  const price = basePrice(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ItemThumb item={item} className="size-10" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {price !== undefined ? fa(price) : '—'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isFull}
                        onClick={() => add(item.id)}
                      >
                        <Plus className="size-4" />
                        افزودن
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
