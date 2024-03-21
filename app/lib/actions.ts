'use server';

import { signIn } from '@/auth';
import { sql } from '@vercel/postgres';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

//#region Schéma pro faktury ___________________________________________________________________________________

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Prosím vyberte zákazníka.',
  }),
  amount: z.coerce.number().gt(0, { message: 'Prosím vložte kladnou částku.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Prosím zvotle status.',
  }),
  date: z.string(),
});

const AmountInCents = (amount: number) => {
  return amount * 100;
};

//#endregion Schéma pro faktury ___________________________________________________________________________________

//#region Vytvoření nové faktury ___________________________________________________________________________________
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
export async function createInvoice(prevState: State, formData: FormData) {
  //Validace s Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  //Pokud je validace úspěšná
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Chybějící pole. Nepodařilo se vytvořit fakturu.',
    };
  }

  //příprava dat pro odeslání
  const { customerId, amount, status } = validatedFields.data;
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId},${AmountInCents(
      amount,
    )},${status},${date})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Chyba vytvoření faktury.' };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

//#endregion Vytvoření nové faktury ___________________________________________________________________________________

//#region Upravení stávající faktury ___________________________________________________________________________________
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  //Pokud je validace úspěšná
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Chybějící pole. Nepodařilo se vytvořit fakturu.',
    };
  }

  //příprava dat pro odeslání
  const { customerId, amount, status } = validatedFields.data;
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${AmountInCents(
      amount,
    )}, status = ${status}
      WHERE id = ${id}
      `;
  } catch (error) {
    return { message: 'Database Error: Chyba úpravy faktury.' };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
//#endregion Upravení stávající faktury ___________________________________________________________________________________

//#region Smazání stávající faktury ___________________________________________________________________________________
export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    return { message: 'Faktura smazána.' };
  } catch (error) {
    return { message: 'Database Error: Chyba úpravy faktury.' };
  }
}
//#endregion Smazání stávající faktury ___________________________________________________________________________________

//#region Authentication ___________________________________________________________________________________
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
//#endregion Authentication ___________________________________________________________________________________
