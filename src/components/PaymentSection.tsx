import { useFormContext, useWatch } from 'react-hook-form';
import type { ExpenseReport } from '../types/expense';
import { FieldError } from './shared/FieldError';

export const PaymentSection = () => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ExpenseReport>();
  const paymentMethod = useWatch({ control, name: 'paymentMethod' });

  return (
    <section className="panel">
      <h2>Zahlungsart</h2>
      <div className="segmented-control">
        <label>
          <input type="radio" value="cash" {...register('paymentMethod')} />
          <span>Bar</span>
        </label>
        <label>
          <input type="radio" value="bankTransfer" {...register('paymentMethod')} />
          <span>Überweisung</span>
        </label>
      </div>

      {paymentMethod === 'bankTransfer' ? (
        <div className="field-grid payment-fields">
          <label className="field">
            <span>Kontoinhaber</span>
            <input
              {...register('bankAccount.accountHolder')}
              aria-invalid={Boolean(errors.bankAccount?.accountHolder)}
            />
            <FieldError message={errors.bankAccount?.accountHolder?.message} />
          </label>
          <label className="field">
            <span>IBAN</span>
            <input {...register('bankAccount.iban')} aria-invalid={Boolean(errors.bankAccount?.iban)} />
            <FieldError message={errors.bankAccount?.iban?.message} />
          </label>
        </div>
      ) : null}
    </section>
  );
};
