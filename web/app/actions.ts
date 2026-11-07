"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addEntry, createStavba, isId, removeEntry, removeStavba } from "@/lib/store";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function addStavbaAction(form: FormData) {
  const name = field(form, "name").slice(0, 80);
  if (!name) return;
  const id = await createStavba(name);
  revalidatePath("/");
  redirect(`/stavba/${id}`);
}

export async function deleteStavbaAction(id: string) {
  await removeStavba(id);
  revalidatePath("/");
  redirect("/");
}

export async function addEntryAction(stavbaId: string, form: FormData) {
  const date = field(form, "date");
  const text = field(form, "text").slice(0, 5000);
  if (!isId(stavbaId) || !text || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return;
  await addEntry(stavbaId, date, text);
  revalidatePath(`/stavba/${stavbaId}`);
}

export async function deleteEntryAction(stavbaId: string, entryId: string) {
  await removeEntry(stavbaId, entryId);
  revalidatePath(`/stavba/${stavbaId}`);
}
