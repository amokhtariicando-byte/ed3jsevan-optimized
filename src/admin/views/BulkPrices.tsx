import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi } from '../api';
import type { AdminItem, MenuState } from '../types';
import { fa } from '../../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { PriceInput } from '../components/PriceInput';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { SegmentedControl } from '../../components/ui/segmented-control';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Field } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Spinner } from '../../components/ui/spinner';
import { useToast } from '../../components/ui/toast';

type PriceMode = 'percent' | 'fixed';
type Direction = 'up' | 'down';

/** True when the item has at least one price field to change. */
function hasPrice(item: AdminItem): boolean {
  return (
    item.price !== undefined ||
    item.priceBlend50 !== undefined ||
    item.priceArabica100 !== undefined
  );
}

export function BulkPricesView() {
  const { toast } = useToast();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('all');
  const [mode, setMode] = useState<PriceMode>('percent');
  const [direction, setDirection] = useState<Direction>('up');
  const [amount, setAmount] = useState<number | undefined>(10);
  const [applying, setApplying] = useState(false);

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

  const categories = useMemo(
    () =>
      [...(menu?.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [menu],
  );

  /** Items the current controls apply to, in menu order. */
  const affected = useMemo(() => {
    if (!menu) return [];
    const catOrder = new Map(
      menu.categories.map((c) => [c.id, c.sortOrder] as const),
    );
    return menu.items
      .filter(
        (item) =>
          (scope === 'all' || item.categoryId === scope) && hasPrice(item),
      )
      .sort(
        (a, b) =>
          (catOrder.get(a.categoryId) ?? 0) - (catOrder.get(b.categoryId) ?? 0) ||
          a.sortOrder - b.sortOrder,
      );
  }, [menu, scope]);

  const computeNew = useCallback(
    (old: number): number => {
      const value = amount ?? 0;
      if (mode === 'percent') {
        const factor =
          direction === 'up' ? 1 + value / 100 : 1 - value / 100;
        return Math.max(1, Math.round(old * factor));
      }
      return Math.max(1, direction === 'up' ? old + value : old - value);
    },
    [amount, direction, mode],
  );

  /** Current / new price text for one row; dual-bean items show both prices. */
  const pricePair = useCallback(
    (item: AdminItem): { current: string; next: string } => {
      const currents: string[] = [];
      const nexts: string[] = [];
      if (item.priceBlend50 !== undefined) {
        currents.push(fa(item.priceBlend50));
        nexts.push(fa(computeNew(item.priceBlend50)));
      }
      if (item.priceArabica100 !== undefined) {
        currents.push(fa(item.priceArabica100));
        nexts.push(fa(computeNew(item.priceArabica100)));
      }
      if (item.price !== undefined) {
        currents.push(fa(item.price));
        nexts.push(fa(computeNew(item.price)));
      }
      return { current: currents.join(' / '), next: nexts.join(' / ') };
    },
    [computeNew],
  );

  const canApply =
    amount !== undefined && amount > 0 && affected.length > 0 && !applying;

  const apply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      await Promise.all(
        affected.map((item) => {
          const patch: Partial<AdminItem> = {};
          if (item.price !== undefined) patch.price = computeNew(item.price);
          if (item.priceBlend50 !== undefined) {
            patch.priceBlend50 = computeNew(item.priceBlend50);
          }
          if (item.priceArabica100 !== undefined) {
            patch.priceArabica100 = computeNew(item.priceArabica100);
          }
          return adminApi.updateItem(item.id, patch);
        }),
      );
      toast({ title: 'قیمت‌ها به‌روز شد', variant: 'success' });
      setAmount(undefined);
      await load();
    } catch {
      toast({ title: 'به‌روزرسانی قیمت‌ها ناموفق بود', variant: 'error' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="تغییر گروهی قیمت"
        description="قیمت چند آیتم را یکجا تغییر دهید."
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
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="محدوده">
                  <Select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    options={[
                      { value: 'all', label: 'همه آیتم‌ها' },
                      ...categories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                  />
                </Field>
                <Field label="نوع تغییر">
                  <SegmentedControl
                    options={[
                      { value: 'percent', label: 'درصدی' },
                      { value: 'fixed', label: 'مبلغ ثابت' },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as PriceMode)}
                    fullWidth
                  />
                </Field>
                <Field label="جهت">
                  <SegmentedControl
                    options={[
                      { value: 'up', label: 'افزایش' },
                      { value: 'down', label: 'کاهش' },
                    ]}
                    value={direction}
                    onChange={(v) => setDirection(v as Direction)}
                    fullWidth
                  />
                </Field>
                <Field
                  label={mode === 'percent' ? 'درصد' : 'مبلغ'}
                  hint={
                    mode === 'percent'
                      ? 'مثلاً ۱۰ یعنی ده درصد'
                      : 'عدد بدون واحد، مثل ۲۰'
                  }
                >
                  <PriceInput
                    value={amount}
                    onChange={setAmount}
                    placeholder={mode === 'percent' ? '۱۰' : '۲۰'}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                تغییرات روی پیش‌نویس اعمال می‌شوند؛ انتشار جداگانه انجام
                می‌شود.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {fa(affected.length)} آیتم تحت تأثیر قرار می‌گیرد
            </p>
            <Button disabled={!canApply} onClick={() => void apply()}>
              {applying && <Loader2 className="size-4 animate-spin" />}
              اعمال
            </Button>
          </div>

          {affected.length === 0 ? (
            <EmptyState
              title="آیتمی در این محدوده نیست"
              description="دسته دیگری را انتخاب کنید."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>قیمت فعلی</TableHead>
                  <TableHead>قیمت جدید</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affected.map((item) => {
                  const pair = pricePair(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell numeric>{pair.current}</TableCell>
                      <TableCell numeric>{pair.next}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
