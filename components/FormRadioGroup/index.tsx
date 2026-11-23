import styles from './styles.module.scss';
import classNames from 'classnames';
import { useId } from 'react';
import type React from 'react';

interface FormRadioOption<T extends string> {
  value: T;
  label: string;
}

interface FormRadioGroupProps<T extends string> {
  label: string;
  options: FormRadioOption<T>[];
  value: T;
  onChange: (newValue: T) => void;
  className?: string;
}

/**
 * FormRadioGroup component - a labelled group of native radio inputs, styled like FormCheckbox
 */
const FormRadioGroup = <T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: FormRadioGroupProps<T>): React.ReactElement => {
  const name = useId();

  return (
    <fieldset className={classNames(styles.wrapper, className)}>
      <legend className={styles.legend}>{label}</legend>

      {options.map(option => (
        <label key={option.value} className={styles.option}>
          <input
            className={styles.input}
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className={styles.label}>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
};

export default FormRadioGroup;
export type { FormRadioGroupProps, FormRadioOption };
