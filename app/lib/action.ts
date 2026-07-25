'use server';
import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!);

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const invoiceDate = (formData: FormData) => {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    return { customerId, amountInCents, status, date };
}


export async function createInvoice(formData: FormData) {
    const { customerId, amountInCents, status, date } = invoiceDate(formData);

    await sql`
    INSERT INTO invoices(customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

};

export async function UpdateInvoice(id: string, formData: FormData) {
    const { customerId, amountInCents, status } = invoiceDate(formData);

    await sql`UPDATE invoices SET amount=${amountInCents}, customer_id=${customerId}, status=${status} WHERE id=${id}`;
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function DeleteInvoiceById(id: string) {
    await sql`DELETE FROM invoices where id = ${id}`;
    revalidatePath('/dashboard/invoices');
}