'use client';

import React from 'react';

interface IOSSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export default function IOSSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel = 'Saklar Aliran Listrik',
}: IOSSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`group relative inline-flex h-[32px] w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 select-none ${
        checked
          ? 'bg-[#34c759] dark:bg-[#30d158]'
          : 'bg-[#e5e5ea] dark:bg-[#39393d]'
      }`}
    >
      {/* Sliding Apple / iOS Thumb */}
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}
