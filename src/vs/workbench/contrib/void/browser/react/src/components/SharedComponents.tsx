/**
 * Shared UI Components & Utilities
 * Reusable components for the void interface
 */

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Loader } from 'lucide-react';

// ============ Toast/Alert Component ============

export interface AlertProps {
	type: 'success' | 'error' | 'warning' | 'info';
	title: string;
	message?: string;
	onClose?: () => void;
	isDark?: boolean;
	autoClose?: number; // ms, 0 = no auto close
}

export const Alert: React.FC<AlertProps> = ({
	type,
	title,
	message,
	onClose,
	isDark = false,
	autoClose = 5000,
}) => {
	const [isVisible, setIsVisible] = React.useState(true);

	React.useEffect(() => {
		if (autoClose === 0) return;

		const timer = setTimeout(() => {
			setIsVisible(false);
			onClose?.();
		}, autoClose);

		return () => clearTimeout(timer);
	}, [autoClose, onClose]);

	if (!isVisible) return null;

	const config = {
		success: {
			icon: CheckCircle,
			bgColor: isDark ? 'bg-green-900 bg-opacity-30' : 'bg-green-50',
			borderColor: isDark ? 'border-green-700' : 'border-green-200',
			textColor: isDark ? 'text-green-200' : 'text-green-800',
			iconColor: 'text-green-400',
		},
		error: {
			icon: AlertCircle,
			bgColor: isDark ? 'bg-red-900 bg-opacity-30' : 'bg-red-50',
			borderColor: isDark ? 'border-red-700' : 'border-red-200',
			textColor: isDark ? 'text-red-200' : 'text-red-800',
			iconColor: 'text-red-400',
		},
		warning: {
			icon: AlertTriangle,
			bgColor: isDark ? 'bg-yellow-900 bg-opacity-30' : 'bg-yellow-50',
			borderColor: isDark ? 'border-yellow-700' : 'border-yellow-200',
			textColor: isDark ? 'text-yellow-200' : 'text-yellow-800',
			iconColor: 'text-yellow-400',
		},
		info: {
			icon: Info,
			bgColor: isDark ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50',
			borderColor: isDark ? 'border-blue-700' : 'border-blue-200',
			textColor: isDark ? 'text-blue-200' : 'text-blue-800',
			iconColor: 'text-blue-400',
		},
	};

	const { icon: IconComponent, bgColor, borderColor, textColor, iconColor } = config[type];

	return (
		<div
			className={`@@void-scope ${bgColor} border ${borderColor} rounded-lg p-4 flex gap-3 items-start ${textColor}`}
		>
			<IconComponent className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
			<div className="flex-1">
				<h3 className="font-semibold">{title}</h3>
				{message && <p className="text-sm mt-1 opacity-90">{message}</p>}
			</div>
			{onClose && (
				<button
					onClick={() => {
						setIsVisible(false);
						onClose();
					}}
					className="text-lg leading-none hover:opacity-75"
				>
					×
				</button>
			)}
		</div>
	);
};

// ============ Loading Spinner ============

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	isDark?: boolean;
	message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = 'md',
	isDark = false,
	message,
}) => {
	const sizeConfig = {
		sm: 'w-4 h-4',
		md: 'w-8 h-8',
		lg: 'w-12 h-12',
	};

	return (
		<div className="flex flex-col items-center gap-2">
			<Loader
				className={`${sizeConfig[size]} animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`}
			/>
			{message && <p className="text-sm opacity-75">{message}</p>}
		</div>
	);
};

// ============ Button Component ============

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
	size?: 'sm' | 'md' | 'lg';
	isDark?: boolean;
	isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
	variant = 'primary',
	size = 'md',
	isDark = false,
	isLoading = false,
	children,
	disabled,
	...props
}) => {
	const variantClasses = {
		primary: isDark
			? 'bg-blue-600 hover:bg-blue-700 text-white'
			: 'bg-blue-500 hover:bg-blue-600 text-white',
		secondary: isDark
			? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
			: 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300',
		danger: isDark
			? 'bg-red-600 hover:bg-red-700 text-white'
			: 'bg-red-500 hover:bg-red-600 text-white',
		ghost: isDark
			? 'hover:bg-gray-700 text-white'
			: 'hover:bg-gray-100 text-gray-900',
	};

	const sizeClasses = {
		sm: 'px-2 py-1 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg',
	};

	return (
		<button
			{...props}
			disabled={disabled || isLoading}
			className={`@@void-scope rounded font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${
				disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''
			} ${props.className || ''}`}
		>
			{isLoading ? (
				<div className="flex items-center gap-2">
					<Loader size={16} className="animate-spin" />
					<span>Loading...</span>
				</div>
			) : (
				children
			)}
		</button>
	);
};

// ============ Badge Component ============

interface BadgeProps {
	label: string;
	variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
	isDark?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', isDark = false }) => {
	const variantClasses = {
		default: isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900',
		success: isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-900',
		warning: isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-900',
		error: isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-900',
		info: isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-900',
	};

	return (
		<span className={`@@void-scope px-2 py-1 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
			{label}
		</span>
	);
};

// ============ Card Component ============

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	isDark?: boolean;
	header?: React.ReactNode;
	footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ isDark = false, header, footer, children, ...props }) => {
	return (
		<div
			className={`@@void-scope rounded-lg border overflow-hidden ${
				isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
			}`}
			{...props}
		>
			{header && (
				<div
					className={`px-4 py-3 border-b ${
						isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
					}`}
				>
					{header}
				</div>
			)}
			<div className="p-4">{children}</div>
			{footer && (
				<div
					className={`px-4 py-3 border-t ${
						isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
					}`}
				>
					{footer}
				</div>
			)}
		</div>
	);
};

// ============ Modal Component ============

interface ModalProps {
	isOpen: boolean;
	title: string;
	onClose: () => void;
	isDark?: boolean;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, isDark = false, children, footer }) => {
	if (!isOpen) return null;

	return (
		<div className="@@void-scope fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<Card
				isDark={isDark}
				className="w-full max-w-md max-h-[90vh] overflow-auto"
				header={
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">{title}</h2>
						<button
							onClick={onClose}
							className={`text-xl leading-none ${
								isDark ? 'hover:text-gray-300' : 'hover:text-gray-600'
							}`}
						>
							×
						</button>
					</div>
				}
				footer={footer}
			>
				{children}
			</Card>
		</div>
	);
};

// ============ Tabs Component ============

interface Tab {
	id: string;
	label: string;
	content: React.ReactNode;
}

interface TabsProps {
	tabs: Tab[];
	defaultTabId?: string;
	isDark?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTabId, isDark = false }) => {
	const [activeTab, setActiveTab] = React.useState(defaultTabId || tabs[0]?.id);

	const activeTabContent = tabs.find(t => t.id === activeTab)?.content;

	return (
		<div className="@@void-scope space-y-4">
			<div
				className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
			>
				{tabs.map(tab => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`px-4 py-2 font-medium border-b-2 transition-colors ${
							activeTab === tab.id
								? isDark
									? 'border-blue-500 text-blue-400'
									: 'border-blue-500 text-blue-600'
								: isDark
								? 'border-transparent text-gray-400 hover:text-gray-300'
								: 'border-transparent text-gray-600 hover:text-gray-900'
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>
			<div>{activeTabContent}</div>
		</div>
	);
};

// ============ Collapsible Component ============

interface CollapsibleProps {
	title: string;
	defaultOpen?: boolean;
	isDark?: boolean;
	children: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
	title,
	defaultOpen = false,
	isDark = false,
	children,
}) => {
	const [isOpen, setIsOpen] = React.useState(defaultOpen);

	return (
		<div
			className={`@@void-scope rounded border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
		>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full px-4 py-2 text-left font-medium flex items-center justify-between hover:opacity-75 transition-opacity ${
					isDark ? 'bg-gray-700' : 'bg-gray-50'
				}`}
			>
				{title}
				<span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
			</button>
			{isOpen && <div className="p-4 border-t border-opacity-20">{children}</div>}
		</div>
	);
};

export default {
	Alert,
	LoadingSpinner,
	Button,
	Badge,
	Card,
	Modal,
	Tabs,
	Collapsible,
};
