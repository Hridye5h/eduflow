import * as React from 'react';

type Variant = 'primary' | 'outline' | 'ghost';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  ({ variant = 'primary', className = '', ...rest }, ref) => {
    const variants: Record<Variant, string> = {
      primary: 'ef-btn ef-btn-primary',
      outline: 'ef-btn ef-btn-outline',
      ghost: 'ef-btn ef-btn-ghost',
    };
    return <button ref={ref} className={`${variants[variant]} ${className}`} {...rest} />;
  },
);
Button.displayName = 'Button';
