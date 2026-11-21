import React, { useState } from 'react';
import { Input } from '../../components/ui/input';
import { en, fa } from '../../lib/utils';

/**
 * Price entry for the admin. Prices are BARE numbers in thousands (۱۷۵) —
 * never with a unit, never with ٬۰۰۰. The field shows Persian digits and
 * accepts Persian, Arabic-Indic, or Latin digits; the value passed up is a
 * plain number (or undefined when empty).
 */
export function PriceInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  const shown = focused ? text : value === undefined ? '' : fa(value);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      dir="ltr"
      className="text-start"
      value={shown}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => {
        setText(value === undefined ? '' : String(value));
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const latin = en(e.target.value).replace(/[^0-9]/g, '');
        setText(latin);
        if (latin === '') {
          onChange(undefined);
          return;
        }
        const n = Number(latin);
        onChange(Number.isFinite(n) ? n : undefined);
      }}
    />
  );
}
