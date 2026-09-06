import React from 'react';
import { ActionMenu, ActionMenuItem } from './ActionMenu';
import { LucideIcon } from 'lucide-react';

export interface QuickRowActionItem {
  id?: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'primary' | 'success';
  disabled?: boolean;
}

interface QuickRowActionDropdownProps {
  actions: QuickRowActionItem[];
  title?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
}

export const QuickRowActionDropdown: React.FC<QuickRowActionDropdownProps> = ({
  actions,
  title = 'خيارات الإجراءات',
  buttonClassName = '',
  align = 'left',
}) => {
  const menuItems: ActionMenuItem[] = actions.map((act) => ({
    id: act.id,
    label: act.label,
    icon: act.icon,
    onClick: act.onClick,
    variant: act.variant,
    disabled: act.disabled,
  }));

  return (
    <ActionMenu
      items={menuItems}
      title={title}
      triggerType="three_dots_vertical"
      align={align}
      className={buttonClassName}
    />
  );
};
