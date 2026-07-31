import { useFormContext } from 'react-hook-form';
import type { ExpenseReport } from '../types/expense';
import { FieldError } from './shared/FieldError';

export const PersonalData = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ExpenseReport>();

  return (
    <section className="panel">
      <h2>Persönliche Angaben</h2>
      <div className="field-grid">
        <label className="field">
          <span>Name</span>
          <input {...register('name')} aria-invalid={Boolean(errors.name)} />
          <FieldError message={errors.name?.message} />
        </label>
        <label className="field">
          <span>Zweck</span>
          <input {...register('purpose')} />
        </label>
      </div>
    </section>
  );
};
