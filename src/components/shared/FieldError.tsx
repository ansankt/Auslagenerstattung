interface FieldErrorProps {
  message?: string;
}

export const FieldError = ({ message }: FieldErrorProps) =>
  message ? <span className="field-error">{message}</span> : null;
