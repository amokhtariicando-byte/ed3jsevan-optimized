import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../api';
import type { Syrup } from '../types';
import { PageHeader } from '../components/PageHeader';
import { PriceInput } from '../components/PriceInput';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { EmptyState } from '../../components/ui/empty-state';
import { Spinner } from '../../components/ui/spinner';
import { useToast } from '../../components/ui/toast';

/** Draft row: a new row has no price until the admin types one. */
interface DraftSyrup {
  id: string;
  name: string;
  price: number | undefined;
}

export function SyrupsView() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<DraftSyrup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const newCounter = useRef(0);

  const load = useCallback(async () => {
    try {
      const menu = await adminApi.getMenu();
      setDraft(menu.syrups.map((s) => ({ ...s })));
    } catch {
      toast({ title: 'بارگذاری سیروپ‌ها ناموفق بود', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (id: string, patch: Partial<DraftSyrup>) => {
    setDraft(
      (prev) => prev?.map((s) => (s.id === id ? { ...s, ...patch } : s)) ?? prev,
    );
  };

  const addRow = () => {
    newCounter.current += 1;
    setDraft((prev) => [
      ...(prev ?? []),
      { id: `new-${newCounter.current}`, name: '', price: undefined },
    ]);
  };

  const removeRow = (id: string) => {
    setDraft((prev) => prev?.filter((s) => s.id !== id) ?? prev);
  };

  const save = async () => {
    if (!draft) return;
    const invalid = draft.some(
      (s) => s.name.trim() === '' || s.price === undefined,
    );
    if (invalid) {
      toast({
        title: 'نام و قیمت همه سیروپ‌ها را کامل کنید.',
        variant: 'error',
      });
      return;
    }
    setSaving(true);
    try {
      const syrups: Syrup[] = draft.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        price: s.price as number,
      }));
      await adminApi.updateSyrups(syrups);
      toast({ title: 'سیروپ‌ها ذخیره شد', variant: 'success' });
      await load();
    } catch {
      toast({ title: 'ذخیره سیروپ‌ها ناموفق بود', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="سیروپ‌ها"
        description="سیروپ‌ها در صفحه جزئیات نوشیدنی‌هایی که قابلیت سیروپ دارند نمایش داده می‌شوند."
        actions={
          <>
            <Button variant="outline" onClick={addRow}>
              <Plus className="size-4" />
              افزودن سیروپ
            </Button>
            <Button
              disabled={saving || draft === null}
              onClick={() => void save()}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              ذخیره سیروپ‌ها
            </Button>
          </>
        }
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="در حال بارگذاری…" />
        </div>
      ) : draft === null ? (
        <EmptyState
          title="سیروپ‌ها بارگذاری نشدند"
          description="دوباره تلاش کنید."
          action={
            <Button variant="outline" onClick={() => void load()}>
              تلاش دوباره
            </Button>
          }
        />
      ) : draft.length === 0 ? (
        <EmptyState
          title="هنوز سیروپی ثبت نشده است"
          description="اولین سیروپ را اضافه کنید."
          action={
            <Button onClick={addRow}>
              <Plus className="size-4" />
              افزودن سیروپ
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {draft.map((syrup) => (
            <div
              key={syrup.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
            >
              <Input
                aria-label="نام سیروپ"
                value={syrup.name}
                onChange={(e) =>
                  updateRow(syrup.id, { name: e.target.value })
                }
                placeholder="نام سیروپ"
                className="min-w-0 flex-1"
              />
              <div className="w-28 shrink-0">
                <PriceInput
                  value={syrup.price}
                  onChange={(v) => updateRow(syrup.id, { price: v })}
                  placeholder="قیمت"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`حذف ${syrup.name || 'سیروپ'}`}
                onClick={() => removeRow(syrup.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
