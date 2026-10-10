import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Checkbox, ControlButton, ControlIconButton, Dialog as SharedDialog,
  EmptyState as SharedEmptyState, ErrorState } from '@xsec/ui-react';
import { Icon, type IconName } from './icon';

export { Spinner, Input, Textarea, Select, Field, NumberInput, Badge, PageHeader, Section } from '@xsec/ui-react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName; tone?: 'default' | 'primary' | 'danger' | 'ghost';
};
export function Button({ icon, children, tone = 'default', className = '', ...props }: ButtonProps) {
  const variant = tone === 'default' ? 'outline' : tone;
  return <ControlButton {...props} variant={variant} size="sm" className={className}>
    {icon ? <Icon name={icon}/> : null}{children}
  </ControlButton>;
}
export function IconButton({ label, icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName }) {
  return <ControlIconButton {...props} label={label}><Icon name={icon}/></ControlIconButton>;
}
export function EmptyState({ children }: { children: ReactNode }) {
  return <SharedEmptyState title={children}/>;
}
export function Notice({ tone = 'error', children, onClose, action }: {
  tone?: 'error' | 'warning' | 'success'; children: ReactNode; onClose?: () => void; action?: ReactNode;
}) {
  const actions = <div className="traffic-notice-actions">{action}{onClose ? <IconButton label="关闭" icon="close" onClick={onClose}/> : null}</div>;
  if (tone === 'error') return <ErrorState title={children} action={actions}/>;
  return <div role="status" className={`traffic-notice is-${tone}`}><span>{children}</span>{actions}</div>;
}
export function Check({ checked, children, onChange, disabled = false }: {
  checked: boolean; children: ReactNode; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  return <Checkbox checked={checked} disabled={disabled} label={children} onCheckedChange={onChange}/>;
}
export function Dialog({ title, children, footer, onClose, width = 820 }: {
  title: string; children: ReactNode; footer: ReactNode; onClose: () => void; width?: number;
}) {
  return <SharedDialog open onOpenChange={open => { if (!open) onClose(); }} title={title}
    className={`traffic-dialog traffic-dialog-${width}`} footer={footer}><div style={{ maxWidth: width }}>{children}</div></SharedDialog>;
}
