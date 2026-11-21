import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { adminApi } from '../api';
import type { AdminItem, MenuState } from '../types';
import type { BackdropTone } from '../../data/menuData';
import { PageHeader } from '../components/PageHeader';
import { PriceInput } from '../components/PriceInput';
import { PhotoSlot } from '../components/PhotoSlot';
import { Field, Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { SegmentedControl } from '../../components/ui/segmented-control';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { AlertDialog } from '../../components/ui/alert-dialog';
import { EmptyState } from '../../components/ui/empty-state';
import { Spinner } from '../../components/ui/spinner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { useToast } from '../../components/ui/toast';

type PriceMode = 'single' | 'dual';

interface FormState {
  name: string;
  description: string;
  categoryId: string;
  priceMode: PriceMode;
  price: number | undefined;
  priceBlend50: number | undefined;
  priceArabica100: number | undefined;
  isHot: boolean;
  supportsSyrup: boolean;
  supportsMilkTemp: boolean;
  highlight: string;
  available: boolean;
  vesselType: 'tall' | 'cup';
  prefersFrontView: boolean;
  backdropTone: BackdropTone;
  image: string;
  frontImage: string;
  cutoutImage: string;
}

const BACKDROP_TONES: { value: BackdropTone; label: string }[] = [
  { value: 'navy', label: 'سرمه‌ای' },
  { value: 'midnight', label: 'نیمه‌شب' },
  { value: 'olive', label: 'زیتونی' },
  { value: 'bronze', label: 'برنز' },
  { value: 'plum', label: 'آلویی' },
];

function formFromItem(
  item: AdminItem | null,
  defaultCategoryId: string,
): FormState {
  const dual =
    item !== null &&
    (item.priceBlend50 !== undefined || item.priceArabica100 !== undefined);
  return {
    name: item?.name ?? '',
    description: item?.description ?? '',
    categoryId: item?.categoryId ?? defaultCategoryId,
    priceMode: dual ? 'dual' : 'single',
    price: item?.price,
    priceBlend50: item?.priceBlend50,
    priceArabica100: item?.priceArabica100,
    isHot: item?.isHot ?? false,
    supportsSyrup: item?.supportsSyrup ?? false,
    supportsMilkTemp: item?.supportsMilkTemp ?? false,
    highlight: item?.highlight ?? '',
    available: item?.available ?? true,
    vesselType: item?.vesselType ?? 'cup',
    prefersFrontView: item?.prefersFrontView ?? false,
    backdropTone: item?.backdropTone ?? 'olive',
    image: item?.image ?? '',
    frontImage: item?.frontImage ?? '',
    cutoutImage: item?.cutoutImage ?? '',
  };
}

function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function ItemEditorView({ itemId }: { itemId: string }) {
  const { toast } = useToast();
  const isNew = itemId === 'new';
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .getMenu()
      .then((state) => {
        if (cancelled) return;
        setMenu(state);
        const sorted = state.categories
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const existing = isNew
          ? null
          : (state.items.find((i) => i.id === itemId) ?? null);
        if (!isNew && !existing) {
          // Item not found: leave form null and show the empty state.
          setForm(null);
        } else {
          setForm(formFromItem(existing, sorted[0]?.id ?? ''));
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: 'بارگذاری آیتم ناموفق بود', variant: 'error' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, isNew, toast]);

  const categories = useMemo(
    () =>
      (menu?.categories ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [menu],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setPriceMode = (mode: PriceMode) => {
    setForm((prev) => {
      if (!prev) return prev;
      return mode === 'single'
        ? { ...prev, priceMode: mode, priceBlend50: undefined, priceArabica100: undefined }
        : { ...prev, priceMode: mode, price: undefined };
    });
  };

  const goBack = () => {
    window.location.hash = '#/admin/items';
  };

  const handleSave = async () => {
    if (!form) return;
    if (form.name.trim() === '') {
      toast({ title: 'نام آیتم را وارد کنید.', variant: 'error' });
      return;
    }
    if (!form.categoryId) {
      toast({ title: 'دسته را انتخاب کنید.', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.priceMode === 'single' ? form.price : undefined,
        priceBlend50:
          form.priceMode === 'dual' ? form.priceBlend50 : undefined,
        priceArabica100:
          form.priceMode === 'dual' ? form.priceArabica100 : undefined,
        supportsSyrup: form.supportsSyrup,
        supportsMilkTemp: form.supportsMilkTemp,
        highlight: form.highlight.trim() || undefined,
        isHot: form.isHot,
        image: form.image,
        frontImage: form.frontImage,
        cutoutImage: form.cutoutImage,
        vesselType: form.vesselType,
        prefersFrontView: form.prefersFrontView,
        backdropTone: form.backdropTone,
        available: form.available,
        // plateAngle is intentionally untouched on edit; on create the mock
        // defaults it to 0.
      };
      if (isNew) {
        await adminApi.createItem(payload);
      } else {
        await adminApi.updateItem(itemId, payload);
      }
      toast({ title: 'ذخیره شد', variant: 'success' });
      goBack();
    } catch {
      toast({ title: 'ذخیره ناموفق بود', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminApi.deleteItem(itemId);
      toast({ title: 'آیتم حذف شد', variant: 'success' });
      goBack();
    } catch {
      toast({ title: 'حذف آیتم ناموفق بود', variant: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="در حال بارگذاری…" />
      </div>
    );
  }

  if (!isNew && menu && !form) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="ویرایش آیتم"
          actions={
            <Button variant="outline" onClick={goBack}>
              <ArrowRight className="size-4" />
              بازگشت به آیتم‌ها
            </Button>
          }
        />
        <EmptyState
          title="آیتم پیدا نشد"
          description="این آیتم حذف شده یا وجود ندارد."
          action={<Button onClick={goBack}>بازگشت به آیتم‌ها</Button>}
        />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-5">
        <PageHeader title={isNew ? 'افزودن آیتم' : 'ویرایش آیتم'} />
        <EmptyState
          title="بارگذاری فرم ناموفق بود"
          description="دوباره تلاش کنید."
          action={<Button onClick={goBack}>بازگشت به آیتم‌ها</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isNew ? 'افزودن آیتم' : `ویرایش «${form.name}»`}
        description={
          isNew
            ? 'آیتم جدید را به منو اضافه کنید'
            : 'مشخصات، قیمت و عکس‌های آیتم را ویرایش کنید'
        }
        actions={
          <Button variant="outline" onClick={goBack}>
            <ArrowRight className="size-4" />
            بازگشت به آیتم‌ها
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>مشخصات اصلی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="نام" htmlFor="item-name">
            <Input
              id="item-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="مثلاً لاته"
            />
          </Field>
          <Field label="توضیح" htmlFor="item-description">
            <Textarea
              id="item-description"
              autoResize
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="توضیح کوتاه درباره‌ی آیتم"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="دسته" htmlFor="item-category">
              <Select
                id="item-category"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="دسته را انتخاب کنید"
              />
            </Field>
            <Field label="برچسب" htmlFor="item-highlight" hint="اختیاری — مثلاً پیشنهاد باریستا">
              <Input
                id="item-highlight"
                value={form.highlight}
                onChange={(e) => set('highlight', e.target.value)}
                placeholder="پیشنهاد باریستا"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قیمت</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="حالت قیمت">
            <SegmentedControl
              options={[
                { value: 'single', label: 'تک‌قیمت' },
                { value: 'dual', label: 'دو قیمتی' },
              ]}
              value={form.priceMode}
              onChange={(value) => setPriceMode(value as PriceMode)}
              aria-label="حالت قیمت"
            />
          </Field>
          {form.priceMode === 'single' ? (
            <Field label="قیمت" htmlFor="item-price">
              <PriceInput
                id="item-price"
                value={form.price}
                onChange={(value) => set('price', value)}
                placeholder="۱۷۵"
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ترکیب ۵۰/۵۰" htmlFor="item-price-blend">
                <PriceInput
                  id="item-price-blend"
                  value={form.priceBlend50}
                  onChange={(value) => set('priceBlend50', value)}
                  placeholder="۱۷۵"
                />
              </Field>
              <Field label="عربیکا ۱۰۰٪" htmlFor="item-price-arabica">
                <PriceInput
                  id="item-price-arabica"
                  value={form.priceArabica100}
                  onChange={(value) => set('priceArabica100', value)}
                  placeholder="۲۳۶"
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ویژگی‌ها و نمایش</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchRow
              label="گرم"
              hint="این نوشیدنی گرم سرو می‌شود"
              checked={form.isHot}
              onCheckedChange={(checked) => set('isHot', checked)}
            />
            <SwitchRow
              label="قابلیت سیروپ"
              hint="مشتری می‌تواند سیروپ اضافه کند"
              checked={form.supportsSyrup}
              onCheckedChange={(checked) => set('supportsSyrup', checked)}
            />
            <SwitchRow
              label="نکته دمای شیر"
              hint="یادداشت دمای شیر ۶۰ تا ۷۰ درجه نمایش داده شود"
              checked={form.supportsMilkTemp}
              onCheckedChange={(checked) => set('supportsMilkTemp', checked)}
            />
            <SwitchRow
              label="موجود"
              hint="خاموش یعنی آیتم ناموجود است"
              checked={form.available}
              onCheckedChange={(checked) => set('available', checked)}
            />
            <SwitchRow
              label="نمای روبه‌رو"
              hint="در نمای روبه‌رو برجسته شود"
              checked={form.prefersFrontView}
              onCheckedChange={(checked) => set('prefersFrontView', checked)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نوع ظرف">
              <SegmentedControl
                options={[
                  { value: 'tall', label: 'لیوان بلند' },
                  { value: 'cup', label: 'فنجان' },
                ]}
                value={form.vesselType}
                onChange={(value) =>
                  set('vesselType', value as 'tall' | 'cup')
                }
                aria-label="نوع ظرف"
              />
            </Field>
            <Field label="لحن پس‌زمینه" htmlFor="item-tone">
              <Select
                id="item-tone"
                value={form.backdropTone}
                onChange={(e) =>
                  set('backdropTone', e.target.value as BackdropTone)
                }
                options={BACKDROP_TONES}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>عکس‌ها</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PhotoSlot
            label="عکس از بالا (روی بشقاب)"
            imageSrc={form.image || undefined}
            onFile={(dataUrl) => set('image', dataUrl)}
            onRemove={() => set('image', '')}
          />
          <PhotoSlot
            label="عکس روبه‌رو (منوی ساده)"
            imageSrc={form.frontImage || undefined}
            onFile={(dataUrl) => set('frontImage', dataUrl)}
            onRemove={() => set('frontImage', '')}
          />
          <PhotoSlot
            label="کات‌اوت شفاف (نمای روبه‌رو)"
            hint="برای نمای روبه‌رو باید پس‌زمینه عکس شفاف باشد؛ حذف خودکار پس‌زمینه با بک‌اند می‌آید"
            imageSrc={form.cutoutImage || undefined}
            onFile={(dataUrl) => set('cutoutImage', dataUrl)}
            onRemove={() => set('cutoutImage', '')}
            preserveTransparency
            tall
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" disabled={saving} onClick={() => void handleSave()}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          ذخیره
        </Button>
        <Button variant="outline" size="lg" onClick={goBack}>
          انصراف
        </Button>
        {!isNew && (
          <Button
            variant="destructive"
            size="lg"
            className="ms-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            حذف آیتم
          </Button>
        )}
      </div>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`حذف «${form.name}»؟`}
        description="این آیتم از منو حذف می‌شود و برگرداندن آن ممکن نیست."
        confirmText="حذف"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
