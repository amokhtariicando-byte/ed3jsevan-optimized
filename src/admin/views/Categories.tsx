import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../api';
import type { AdminCategory, MenuState } from '../types';
import type { BackdropTone } from '../../data/menuData';
import { fa } from '../../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog } from '../../components/ui/dialog';
import { AlertDialog } from '../../components/ui/alert-dialog';
import { Field, Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { SortableList } from '../../components/ui/sortable-list';
import { EmptyState } from '../../components/ui/empty-state';
import { Spinner } from '../../components/ui/spinner';
import { useToast } from '../../components/ui/toast';

const TONE_OPTIONS = [
  { value: 'navy', label: 'سرمه‌ای' },
  { value: 'midnight', label: 'نیمه‌شب' },
  { value: 'olive', label: 'زیتونی' },
  { value: 'bronze', label: 'برنز' },
  { value: 'plum', label: 'آلویی' },
];

interface CategoryForm {
  name: string;
  shortName: string;
  subtitle: string;
  defaultTone: BackdropTone;
  comingSoon: boolean;
  comingSoonDescription: string;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  shortName: '',
  subtitle: '',
  defaultTone: 'olive',
  comingSoon: false,
  comingSoonDescription: '',
};

export function CategoriesView() {
  const { toast } = useToast();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

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

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of menu?.items ?? []) {
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [menu]);

  // Stable callbacks: Dialog re-runs its focus/scroll effect when
  // onOpenChange changes identity, so inline arrows would steal focus
  // on every keystroke inside the form.
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditing(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      shortName: category.shortName,
      subtitle: category.subtitle ?? '',
      defaultTone: category.defaultTone,
      comingSoon: category.comingSoon ?? false,
      comingSoonDescription: category.comingSoonDescription ?? '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.shortName.trim()) {
      toast({
        title: 'نام کامل و برچسب کوتاه را وارد کنید.',
        variant: 'error',
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        subtitle: form.subtitle.trim(),
        defaultTone: form.defaultTone,
        comingSoon: form.comingSoon,
        comingSoonDescription: form.comingSoon
          ? form.comingSoonDescription.trim() || undefined
          : undefined,
      };
      if (editing) {
        await adminApi.updateCategory(editing.id, payload);
        toast({ title: 'دسته به‌روز شد', variant: 'success' });
      } else {
        await adminApi.createCategory(payload);
        toast({ title: 'دسته اضافه شد', variant: 'success' });
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch {
      toast({ title: 'ذخیره دسته ناموفق بود', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (reordered: AdminCategory[]) => {
    // Optimistic update with fresh sortOrder values, so the sorted render
    // keeps the new order while the API call is in flight.
    const withOrder = reordered.map((c, i) => ({ ...c, sortOrder: i }));
    setMenu((prev) => (prev ? { ...prev, categories: withOrder } : prev));
    try {
      await adminApi.reorderCategories(reordered.map((c) => c.id));
      toast({ title: 'ترتیب دسته‌ها به‌روز شد', variant: 'success' });
    } catch {
      toast({ title: 'ذخیره ترتیب ناموفق بود', variant: 'error' });
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteCategory(deleteTarget.id);
      toast({ title: 'دسته حذف شد', variant: 'success' });
      await load();
    } catch (err) {
      toast({
        title:
          err instanceof Error ? err.message : 'حذف دسته ناموفق بود',
        variant: 'error',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="دسته‌بندی‌ها"
        description="ترتیب دسته‌ها را با کشیدن جابه‌جا کنید."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            افزودن دسته
          </Button>
        }
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
      ) : categories.length === 0 ? (
        <EmptyState
          title="هنوز دسته‌ای ثبت نشده است"
          description="اولین دسته را اضافه کنید."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              افزودن دسته
            </Button>
          }
        />
      ) : (
        <SortableList
          items={categories}
          getKey={(c) => c.id}
          getLabel={(c) => c.name}
          label="ترتیب دسته‌ها"
          onReorder={(reordered) => void handleReorder(reordered)}
          renderItem={(category) => {
            const count = itemCounts.get(category.id) ?? 0;
            return (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.shortName}
                  </span>
                  {category.comingSoon && (
                    <Badge variant="warning">به‌زودی</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {fa(count)} آیتم
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      دسته دارای آیتم است؛ اول آیتم‌ها را جابه‌جا کنید
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`ویرایش ${category.name}`}
                    onClick={() => openEdit(category)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`حذف ${category.name}`}
                    disabled={count > 0}
                    onClick={() => setDeleteTarget(category)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          }}
        />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        title={editing ? 'ویرایش دسته' : 'افزودن دسته'}
        className="max-h-[90vh] overflow-y-auto"
        footer={
          <>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              ذخیره
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="نام کامل" htmlFor="cat-name">
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثلاً قهوه‌های داغ"
            />
          </Field>
          <Field label="برچسب کوتاه کاشی" htmlFor="cat-short-name">
            <Input
              id="cat-short-name"
              value={form.shortName}
              onChange={(e) =>
                setForm({ ...form, shortName: e.target.value })
              }
              placeholder="مثلاً قهوه داغ"
            />
          </Field>
          <Field label="زیرعنوان" htmlFor="cat-subtitle">
            <Textarea
              id="cat-subtitle"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="توضیح کوتاه دسته"
            />
          </Field>
          <Field label="لحن پیش‌فرض">
            <Select
              value={form.defaultTone}
              onChange={(e) =>
                setForm({ ...form, defaultTone: e.target.value as BackdropTone })
              }
              options={TONE_OPTIONS}
            />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground/90">
              به‌زودی
            </span>
            <Switch
              checked={form.comingSoon}
              onCheckedChange={(checked) =>
                setForm({ ...form, comingSoon: checked })
              }
            />
          </div>
          {form.comingSoon && (
            <Field label="توضیح به‌زودی" htmlFor="cat-coming-soon-desc">
              <Input
                id="cat-coming-soon-desc"
                value={form.comingSoonDescription}
                onChange={(e) =>
                  setForm({ ...form, comingSoonDescription: e.target.value })
                }
                placeholder="مثلاً به‌زودی در ایوان"
              />
            </Field>
          )}
        </div>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title={`حذف دسته «${deleteTarget?.name ?? ''}»`}
        description="این دسته برای همیشه حذف می‌شود."
        confirmText="حذف"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
