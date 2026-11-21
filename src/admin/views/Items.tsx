import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../api';
import type { AdminItem, MenuState } from '../types';
import { fa } from '../../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../../components/ui/search-input';
import { Select } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { AlertDialog } from '../../components/ui/alert-dialog';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { SortableList } from '../../components/ui/sortable-list';
import { useToast } from '../../components/ui/toast';

/** Bare-number price display: single price, or blend / arabica. */
function priceLabel(item: AdminItem): string {
  if (item.price !== undefined) return fa(item.price);
  const blend =
    item.priceBlend50 !== undefined ? fa(item.priceBlend50) : null;
  const arabica =
    item.priceArabica100 !== undefined ? fa(item.priceArabica100) : null;
  if (blend && arabica) return `${blend} / ${arabica}`;
  return blend ?? arabica ?? '—';
}

export function ItemsView() {
  const { toast } = useToast();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [reordering, setReordering] = useState(false);
  const [ordered, setOrdered] = useState<AdminItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<AdminItem | null>(null);

  const load = useCallback(async () => {
    try {
      setMenu(await adminApi.getMenu());
    } catch {
      toast({ title: 'بارگذاری آیتم‌ها ناموفق بود', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () =>
      (menu?.categories ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [menu],
  );

  const categoryName = useCallback(
    (id: string) =>
      categories.find((c) => c.id === id)?.name ?? id,
    [categories],
  );

  const filtered = useMemo(() => {
    const items = (menu?.items ?? []).slice();
    const q = query.trim();
    return items
      .filter((i) => categoryId === 'all' || i.categoryId === categoryId)
      .filter((i) => q === '' || i.name.includes(q))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [menu, categoryId, query]);

  const startReorder = () => {
    // Reorder the whole category, ignoring any search query, so sort orders
    // stay unique across the category.
    setQuery('');
    setOrdered(
      (menu?.items ?? [])
        .filter((i) => i.categoryId === categoryId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
    setReordering(true);
  };

  const handleReorder = async (items: AdminItem[]) => {
    setOrdered(items);
    try {
      await adminApi.reorderItems(
        categoryId,
        items.map((i) => i.id),
      );
      setMenu((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) => {
                const idx = items.findIndex((i) => i.id === item.id);
                return idx >= 0 ? { ...item, sortOrder: idx } : item;
              }),
            }
          : prev,
      );
      toast({ title: 'ترتیب ذخیره شد', variant: 'success' });
    } catch {
      toast({ title: 'ذخیره‌ی ترتیب ناموفق بود', variant: 'error' });
      void load();
    }
  };

  const toggleAvailable = async (item: AdminItem, available: boolean) => {
    try {
      await adminApi.updateItem(item.id, { available });
      setMenu((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === item.id ? { ...i, available } : i,
              ),
            }
          : prev,
      );
    } catch {
      toast({ title: 'تغییر وضعیت ناموفق بود', variant: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteItem(pendingDelete.id);
      toast({ title: 'آیتم حذف شد', variant: 'success' });
      await load();
    } catch {
      toast({ title: 'حذف آیتم ناموفق بود', variant: 'error' });
    }
  };

  if (loading || !menu) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="آیتم‌های منو"
          description="جست‌وجو، ویرایش، حذف و تغییر ترتیب آیتم‌ها"
        />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const singleCategorySelected = categoryId !== 'all';

  return (
    <div className="space-y-5">
      <PageHeader
        title="آیتم‌های منو"
        description="جست‌وجو، ویرایش، حذف و تغییر ترتیب آیتم‌ها"
        actions={
          <Button
            onClick={() => {
              window.location.hash = '#/admin/items/new';
            }}
          >
            <Plus className="size-4" />
            افزودن آیتم
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="min-w-52 flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="جست‌وجوی نام آیتم…"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setReordering(false);
            }}
            options={[
              { value: 'all', label: 'همه دسته‌ها' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        {singleCategorySelected && (
          <Button
            variant={reordering ? 'secondary' : 'outline'}
            onClick={() => {
              if (reordering) setReordering(false);
              else startReorder();
            }}
          >
            <ArrowUpDown className="size-4" />
            {reordering ? 'پایان تغییر ترتیب' : 'تغییر ترتیب'}
          </Button>
        )}
      </div>

      {reordering ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            آیتم‌ها را بکشید و رها کنید تا ترتیبشان در دسته‌ی «
            {categoryName(categoryId)}» عوض شود.
          </p>
          {ordered.length === 0 ? (
            <EmptyState
              title="در این دسته آیتمی نیست"
              description="اول یک آیتم به این دسته اضافه کنید."
            />
          ) : (
            <SortableList
              items={ordered}
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              onReorder={(items) => void handleReorder(items)}
              label={`ترتیب آیتم‌های ${categoryName(categoryId)}`}
              renderItem={(item) => (
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {priceLabel(item)}
                  </span>
                </span>
              )}
            />
          )}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="آیتمی پیدا نشد"
          description={
            query.trim() === ''
              ? 'در این دسته هنوز آیتمی ثبت نشده است.'
              : 'هیچ آیتمی با این جست‌وجو مطابقت ندارد.'
          }
          action={
            <Button
              onClick={() => {
                window.location.hash = '#/admin/items/new';
              }}
            >
              <Plus className="size-4" />
              افزودن آیتم
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>عکس</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>دسته</TableHead>
              <TableHead>قیمت</TableHead>
              <TableHead>موجود</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const thumb = item.image || item.frontImage;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.name}
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <ImageOff className="size-4" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryName(item.categoryId)}
                  </TableCell>
                  <TableCell numeric>{priceLabel(item)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.available}
                      onCheckedChange={(checked) =>
                        void toggleAvailable(item, checked)
                      }
                      aria-label={`موجود بودن ${item.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.hash = `#/admin/items/${encodeURIComponent(item.id)}`;
                        }}
                      >
                        <Pencil className="size-4" />
                        ویرایش
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="size-4" />
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`حذف «${pendingDelete?.name ?? ''}»؟`}
        description="این آیتم از منو حذف می‌شود و برگرداندن آن ممکن نیست."
        confirmText="حذف"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
