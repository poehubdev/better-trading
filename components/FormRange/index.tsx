import styles from './styles.module.scss';
import classNames from 'classnames';
import { useId } from 'react';
import type React from 'react';

interface FormRangeProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Text shown next to the slider, e.g. "60%" */
  valueText: string;
  onChange: (newValue: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * FormRange component - a labelled native range slider with its current value
 */
const FormRange: React.FC<FormRangeProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  valueText,
  onChange,
  disabled,
  className,
}) => {
  const id = useId();

  return (
    <div className={classNames(styles.wrapper, disabled && styles.isDisabled, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        disabled={disabled}
        onChange={event => onChange(Number(event.target.value))}
      />
      <span className={styles.value}>{valueText}</span>
    </div>
  );
};

export default FormRange;
export type { FormRangeProps };
