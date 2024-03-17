'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

//#region Schéma pro faktury ___________________________________________________________________________________

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const AmountInCents = (amount: number) => {
  return amount * 100;
};

//#endregion Schéma pro faktury ___________________________________________________________________________________

//#region Vytvoření nové faktury ___________________________________________________________________________________
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const date = new Date().toISOString().split('T')[0];

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId},${AmountInCents(
      amount,
    )},${status},${date})
    `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

//#endregion Vytvoření nové faktury ___________________________________________________________________________________

//#region Upravení stávající faktury ___________________________________________________________________________________
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  await sql`
  UPDATE invoices
  SET customer_id = ${customerId}, amount = ${AmountInCents(
    amount,
  )}, status = ${status}
  WHERE id = ${id}
`;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
//#endregion Upravení stávající faktury ___________________________________________________________________________________

//#region Smazání stávající faktury ___________________________________________________________________________________
export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}
//#endregion Smazání stávající faktury ___________________________________________________________________________________
