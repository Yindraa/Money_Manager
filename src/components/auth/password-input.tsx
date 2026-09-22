"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export function PasswordInput({ name = "password", placeholder = "Password", autoComplete = "current-password", minLength = 8, maxLength = 72, autoFocus = false }: { name?: string; placeholder?: string; autoComplete?: string; minLength?: number; maxLength?: number; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);

  return <div className="relative">
    <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
    <input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} className="form-input form-input-leading h-11 py-0 pr-12" placeholder={placeholder} minLength={minLength} maxLength={maxLength} required autoFocus={autoFocus} />
    <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
  </div>;
}
