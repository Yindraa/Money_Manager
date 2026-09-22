"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return <button className="primary-button h-11 w-full" type="submit" disabled={pending}>
    {pending ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}
    {pending ? "Mengirim tautan..." : "Kirim tautan masuk"}
  </button>;
}

export function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return <button className="primary-button h-11 w-full" type="submit" disabled={pending}>
    {pending ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}
    {pending ? "Memeriksa akun..." : "Masuk sebagai owner"}
  </button>;
}
