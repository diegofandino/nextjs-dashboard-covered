'use server';
import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/app/auth';
import { AuthError } from 'next-auth';

type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    }
    message?: string | null;
}

const sql = postgres(process.env.POSTGRES_URL!);

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, { message: 'Amount must be greater than 0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status'
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const invoiceDate = (formData: FormData) => {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });

    if (!validatedFields.success) {
        console.error('Invoice validation errors:', validatedFields.error.flatten().fieldErrors);

        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to save invoice.',
        };
    }

    const amountInCents = validatedFields.data.amount * 100;
    const date = new Date().toISOString().split('T')[0];

    return { customerId: validatedFields.data.customerId, amountInCents, status: validatedFields.data.status, date };
}


export async function createInvoice(prevState: State, formData: FormData): Promise<State> {
    const validatedFields = invoiceDate(formData);

    if ('errors' in validatedFields) {
        return {
            errors: validatedFields.errors,
            message: validatedFields.message,
        };
    }

    try {
        await sql`
    INSERT INTO invoices(customer_id, amount, status, date)
    VALUES (${validatedFields.customerId}, ${validatedFields.amountInCents}, ${validatedFields.status}, ${validatedFields.date})
    `;



    } catch (error) {
        console.log(error);
        return {
            message: "Database Error: Failed to create invoice.",
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');


};

export async function UpdateInvoice(id: string, prevState: State, formData: FormData): Promise<State> {
    const validatedFields = invoiceDate(formData);

    if ('errors' in validatedFields) {
        return {
            errors: validatedFields.errors,
            message: 'Missing fields. Failed to update invoice.',
        }
    }

    const { customerId, amountInCents, status } = validatedFields;

    try {
        await sql`UPDATE invoices SET amount=${amountInCents}, customer_id=${customerId}, status=${status} WHERE id=${id}`;

    } catch (error) {
        return { message: 'Failed to update invoice' }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

export async function DeleteInvoiceById(id: string): Promise<void> {
    try {
        await sql`DELETE FROM invoices where id = ${id}`;
    } catch (error) {
        throw new Error('Database Error: Failed to Delete Invoice.');
    }

    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials'
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}