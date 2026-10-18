import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { Icon, type IconProps } from "./Icon";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  iconLeft?: IconProps["name"];
  iconRight?: IconProps["name"];
  size?: "sm" | "md" | "lg";
  containerStyle?: CSSProperties;
}

export function Input({ label, help, error, iconLeft, iconRight, size = "md", disabled, containerStyle, ...rest }: InputProps) {
  return (
    <label className="ob-field" style={containerStyle}>
      {label && <span className="ob-label">{label}</span>}
      <span className={"ob-control ob-control--" + size + (error ? " ob-control--error" : "") + (disabled ? " ob-control--disabled" : "")}>
        {iconLeft && <Icon name={iconLeft} size={18} />}
        <input disabled={disabled} aria-invalid={error ? true : undefined} {...rest} />
        {iconRight && <Icon name={iconRight} size={18} />}
      </span>
      {(error || help) && <span className={"ob-help" + (error ? " ob-help--error" : "")}>{error || help}</span>}
    </label>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  containerStyle?: CSSProperties;
}

export function Textarea({ label, help, error, containerStyle, ...rest }: TextareaProps) {
  return (
    <label className="ob-field" style={containerStyle}>
      {label && <span className="ob-label">{label}</span>}
      <textarea className="ob-textarea" style={error ? { borderColor: "var(--danger)" } : undefined} {...rest} />
      {(error || help) && <span className={"ob-help" + (error ? " ob-help--error" : "")}>{error || help}</span>}
    </label>
  );
}

export type SelectOption = string | { value: string; label: string };

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: ReactNode;
  help?: ReactNode;
  options: SelectOption[];
  size?: "sm" | "md" | "lg";
  containerStyle?: CSSProperties;
}

export function Select({ label, help, options, size = "md", containerStyle, ...rest }: SelectProps) {
  return (
    <label className="ob-field" style={containerStyle}>
      {label && <span className="ob-label">{label}</span>}
      <span className={"ob-control ob-control--" + size}>
        <select {...rest}>
          {options.map((o) =>
            typeof o === "string" ? (
              <option key={o}>{o}</option>
            ) : (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ),
          )}
        </select>
        <Icon name="chevron-down" size={16} style={{ pointerEvents: "none" }} />
      </span>
      {help && <span className="ob-help">{help}</span>}
    </label>
  );
}

interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  containerStyle?: CSSProperties;
}

export function Checkbox({ label, description, disabled, containerStyle, ...rest }: CheckProps) {
  return (
    <label className={"ob-check" + (disabled ? " ob-check--disabled" : "")} style={containerStyle}>
      <input type="checkbox" disabled={disabled} {...rest} />
      <span className="ob-check__box">
        <Icon name="check" size={13} />
      </span>
      {(label || description) && (
        <span>
          {label}
          {description && <span className="ob-check__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Radio({ label, description, disabled, containerStyle, ...rest }: CheckProps) {
  return (
    <label className={"ob-check" + (disabled ? " ob-check--disabled" : "")} style={containerStyle}>
      <input type="radio" disabled={disabled} {...rest} />
      <span className="ob-check__box ob-check__box--radio">
        <i className="ob-check__dot" />
      </span>
      {(label || description) && (
        <span>
          {label}
          {description && <span className="ob-check__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Switch({ label, description, disabled, containerStyle, ...rest }: CheckProps) {
  return (
    <label className={"ob-check" + (disabled ? " ob-check--disabled" : "")} style={containerStyle}>
      <input type="checkbox" role="switch" disabled={disabled} {...rest} />
      <span className="ob-switch__track">
        <i className="ob-switch__thumb" />
      </span>
      {(label || description) && (
        <span>
          {label}
          {description && <span className="ob-check__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}
