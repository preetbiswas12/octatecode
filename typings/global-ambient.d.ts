// Project-wide ambient declarations to satisfy missing types during build

declare namespace NodeJS {
	type Timeout = ReturnType<typeof setTimeout>;
}

declare module 'lucide-react' {
	export const Brain: any;
	export const Check: any;
	export const ChevronRight: any;
	export const DollarSign: any;
	export const ExternalLink: any;
	export const Lock: any;
	export const X: any;
	export const RefreshCw: any;
	export const Loader2: any;
	export const Asterisk: any;
	export const Plus: any;
	const _default: any;
	export default _default;
}

declare module 'minimatch' {
	const minimatch: any;
	export = minimatch;
}

declare module '*.css';
