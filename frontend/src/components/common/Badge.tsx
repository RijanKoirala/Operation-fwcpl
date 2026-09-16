import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const dotColors = {
    default: 'bg-slate-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    neutral: 'bg-gray-500',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} tracking-tight`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'Completed':
    case 'Closed':
    case 'Resolved':
    case 'Activated':
    case 'Active':
    case 'Achieved':
      return <Badge variant="success" dot>{status}</Badge>;
    case 'In Progress':
    case 'Installed':
    case 'Site Survey Completed':
    case 'Partially Achieved':
      return <Badge variant="info" dot>{status}</Badge>;
    case 'Assigned':
    case 'Acknowledged':
    case 'Contacted':
    case 'Waiting for Customer':
    case 'Waiting':
      return <Badge variant="purple" dot>{status}</Badge>;
    case 'New':
    case 'New Request':
    case 'Pending':
    case 'Site Survey Required':
    case 'Documents Pending':
      return <Badge variant="warning" dot>{status}</Badge>;
    case 'Overdue':
    case 'Critical':
    case 'Rejected':
    case 'Failed':
    case 'Missed':
      return <Badge variant="danger" dot>{status}</Badge>;
    case 'Cancelled':
    case 'Inactive':
      return <Badge variant="neutral">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  switch (priority) {
    case 'Critical':
    case 'Urgent':
      return <Badge variant="danger" dot>{priority}</Badge>;
    case 'High':
      return <Badge variant="warning" dot>{priority}</Badge>;
    case 'Medium':
      return <Badge variant="info">{priority}</Badge>;
    case 'Low':
    default:
      return <Badge variant="neutral">{priority}</Badge>;
  }
};
