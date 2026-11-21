import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { adminApi } from '../api';
import type { CafeInfoEditable } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Field, Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';

const EMPTY_FORM: CafeInfoEditable = {
  brandName: '',
  brandSubtitle: '',
  tagline: '',
  instagramHandle: '',
  instagramUrl: '',
  hours: '',
  milkTempNote: '',
  paymentNote: '',
  address: '',
  coordinatesLabel: '',
};

/** اطلاعات کافه: نام، اینستاگرام، ساعت کاری، آدرس و نکته‌ها. */
export function CafeInfoView() {
  const { toast } = useToast();
  const [form, setForm] = useState<CafeInfoEditable>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getMenu()
      .then((menu) => {
        if (!cancelled) setForm({ ...menu.cafeInfo });
      })
      .catch(() => {
        if (!cancelled)
          toast({ title: 'بارگذاری اطلاعات کافه ناموفق بود', variant: 'error' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const set =
    (key: keyof CafeInfoEditable) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await adminApi.updateCafeInfo(form);
      setForm({ ...saved });
      toast({ title: 'ذخیره شد', variant: 'success' });
    } catch {
      toast({ title: 'ذخیره ناموفق بود', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="اطلاعات کافه"
          description="این اطلاعات در منوی عمومی نمایش داده می‌شود."
        />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="اطلاعات کافه"
        description="این اطلاعات در منوی عمومی نمایش داده می‌شود."
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            ذخیره
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="نام برند" htmlFor="cafe-brand-name">
              <Input
                id="cafe-brand-name"
                value={form.brandName}
                onChange={set('brandName')}
                placeholder="ایوان"
              />
            </Field>
            <Field label="زیرعنوان" htmlFor="cafe-brand-subtitle">
              <Input
                id="cafe-brand-subtitle"
                value={form.brandSubtitle}
                onChange={set('brandSubtitle')}
                placeholder="کافه و رستوران"
              />
            </Field>
          </div>

          <Field label="شعار" htmlFor="cafe-tagline">
            <Textarea
              id="cafe-tagline"
              value={form.tagline}
              onChange={set('tagline')}
              autoResize
              placeholder="جمله‌ای کوتاه درباره کافه"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="اینستاگرام" htmlFor="cafe-instagram-handle">
              <Input
                id="cafe-instagram-handle"
                dir="ltr"
                value={form.instagramHandle}
                onChange={set('instagramHandle')}
                placeholder="@cafeeyvan_"
              />
            </Field>
            <Field label="آدرس اینستاگرام" htmlFor="cafe-instagram-url">
              <Input
                id="cafe-instagram-url"
                dir="ltr"
                value={form.instagramUrl}
                onChange={set('instagramUrl')}
                placeholder="https://www.instagram.com/cafeeyvan_"
              />
            </Field>
          </div>

          <Field label="ساعت کاری" htmlFor="cafe-hours">
            <Input
              id="cafe-hours"
              value={form.hours}
              onChange={set('hours')}
              placeholder="همه‌روزه از ۹:۰۰ تا ۲۳:۳۰"
            />
          </Field>

          <Field
            label="آدرس"
            htmlFor="cafe-address"
            hint="آدرس دقیق کافه که در منو نمایش داده می‌شود"
          >
            <Textarea
              id="cafe-address"
              value={form.address}
              onChange={set('address')}
              autoResize
              placeholder="آدرس دقیق کافه"
            />
          </Field>

          <Field label="نکته دمای شیر" htmlFor="cafe-milk-note">
            <Textarea
              id="cafe-milk-note"
              value={form.milkTempNote}
              onChange={set('milkTempNote')}
              autoResize
              placeholder="توضیح درباره دمای شیر"
            />
          </Field>

          <Field label="نکته پرداخت" htmlFor="cafe-payment-note">
            <Textarea
              id="cafe-payment-note"
              value={form.paymentNote}
              onChange={set('paymentNote')}
              autoResize
              placeholder="توضیح درباره نحوه پرداخت"
            />
          </Field>

          <Field label="برچسب موقعیت مکانی" htmlFor="cafe-coords-label">
            <Input
              id="cafe-coords-label"
              value={form.coordinatesLabel}
              onChange={set('coordinatesLabel')}
              placeholder="برچسب نمایش موقعیت روی نقشه"
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
