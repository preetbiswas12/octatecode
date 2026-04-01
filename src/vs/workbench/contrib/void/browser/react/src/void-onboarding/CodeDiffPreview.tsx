/**
 * Code Diff Preview Component
 * Displays code changes with visual diff highlighting
 */

import React, { useState } from 'react';
import { ChevronDown, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';

export interface DiffLine {
	type: 'added' | 'removed' | 'context';
	content: string;
	lineNumber?: number;
}

export interface CodeDiff {
	id: string;
	filePath: string;
	language: string;
	oldCode: string;
	newCode: string;
	startLine: number;
	endLine: number;
	applied?: boolean;
	appliedBy?: string;
	appliedAt?: string;
	error?: string;
}

interface CodeDiffPreviewProps {
	diff: CodeDiff;
	onApply?: (diffId: string) => Promise<void>;
	isDark?: boolean;
	isApplying?: boolean;
}

const generateDiffLines = (oldCode: string, newCode: string): DiffLine[] => {
	const oldLines = oldCode.split('\n');
	const newLines = newCode.split('\n');

	// Simple diff algorithm (in production, use 'diff' library)
	const lines: DiffLine[] = [];

	// Add all old lines as removed (simplified)
	oldLines.forEach(line => {
		lines.push({ type: 'removed', content: line });
	});

	// Add all new lines as added
	newLines.forEach(line => {
		lines.push({ type: 'added', content: line });
	});

	return lines;
};

const formatLineNumber = (num: number | undefined, total: number): string => {
	if (num === undefined) return '';
	const padding = Math.max(2, String(total).length);
	return String(num).padStart(padding, ' ');
};

export const CodeDiffPreview: React.FC<CodeDiffPreviewProps> = ({
	diff,
	onApply,
	isDark = false,
	isApplying = false,
}) => {
	const [isExpanded, setIsExpanded] = useState(true);
	const [copied, setCopied] = useState(false);
	const [applyError, setApplyError] = useState<string | null>(null);

	const diffLines = generateDiffLines(diff.oldCode, diff.newCode);
	const totalLines = Math.max(diff.oldCode.split('\n').length, diff.newCode.split('\n').length);

	const handleCopyNewCode = () => {
		navigator.clipboard.writeText(diff.newCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleApply = async () => {
		if (!onApply) return;

		setApplyError(null);
		try {
			await onApply(diff.id);
		} catch (err) {
			setApplyError(err instanceof Error ? err.message : 'Failed to apply diff');
		}
	};

	return (
		<div
			className={`@@void-scope rounded-lg overflow-hidden border ${
				isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
			}`}
		>
			{/* Header */}
			<div
				className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
					isDark ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-100 hover:bg-gray-50'
				}`}
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center gap-3 flex-1">
					<ChevronDown
						size={18}
						className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
					/>
					<div>
						<h3 className="font-mono text-sm font-medium">{diff.filePath}</h3>
						<p className="text-xs opacity-75">
							Lines {diff.startLine}-{diff.endLine}
							{diff.language && ` • ${diff.language}`}
						</p>
					</div>
				</div>

				{/* Status Badge */}
				<div className="flex items-center gap-2">
					{diff.applied ? (
						<div className="flex items-center gap-1 px-2 py-1 bg-green-900 bg-opacity-30 rounded">
							<CheckCircle size={14} className="text-green-400" />
							<span className="text-xs">Applied</span>
						</div>
					) : (
						<div className="flex items-center gap-1 px-2 py-1 bg-yellow-900 bg-opacity-30 rounded">
							<AlertCircle size={14} className="text-yellow-400" />
							<span className="text-xs">Pending</span>
						</div>
					)}
				</div>
			</div>

			{/* Content */}
			{isExpanded && (
				<div className={`${isDark ? 'bg-gray-900' : 'bg-white'}`}>
					{/* Code Viewer */}
					<div className="font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto border-t border-b border-opacity-20">
						{diffLines.length === 0 ? (
							<div className="p-4 text-center opacity-50">No changes</div>
						) : (
							<div className="divide-y divide-opacity-10">
								{diffLines.map((line, idx) => (
									<div
										key={idx}
										className={`flex ${
											line.type === 'added'
												? isDark
													? 'bg-green-900 bg-opacity-20'
													: 'bg-green-50'
												: line.type === 'removed'
												? isDark
													? 'bg-red-900 bg-opacity-20'
													: 'bg-red-50'
												: ''
										}`}
									>
										<div className="flex items-center gap-2 px-2 py-1 select-none opacity-50 min-w-max">
											<span
												className={`text-xs font-mono ${
													line.type === 'added'
														? 'text-green-400'
														: line.type === 'removed'
														? 'text-red-400'
														: isDark
														? 'text-gray-500'
														: 'text-gray-400'
												}`}
											>
												{line.type === 'added'
													? '+'
													: line.type === 'removed'
													? '-'
													: ' '}
											</span>
										</div>
										<pre className={`flex-1 px-4 py-1 whitespace-pre-wrap break-words ${
											isDark ? 'text-gray-100' : 'text-gray-900'
										}`}>
											{line.content || '\n'}
										</pre>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Error Message */}
					{applyError && (
						<div
							className={`px-4 py-2 border-t ${
								isDark
									? 'bg-red-900 bg-opacity-30 border-red-700 text-red-300'
									: 'bg-red-50 border-red-200 text-red-700'
							}`}
						>
							<div className="flex items-center gap-2">
								<AlertCircle size={16} />
								<span className="text-sm">{applyError}</span>
							</div>
						</div>
					)}

					{/* Footer Actions */}
					<div className={`px-4 py-3 flex gap-2 border-t ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
						<button
							onClick={handleCopyNewCode}
							className={`px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
								isDark
									? 'bg-gray-700 hover:bg-gray-600 text-white'
									: 'bg-gray-200 hover:bg-gray-300 text-gray-900'
							}`}
						>
							{copied ? (
								<>
									<Check size={14} />
									Copied!
								</>
							) : (
								<>
									<Copy size={14} />
									Copy
								</>
							)}
						</button>

						{!diff.applied && onApply && (
							<button
								onClick={handleApply}
								disabled={isApplying || diff.applied}
								className={`px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors flex-1 justify-center font-medium ${
									isApplying || diff.applied
										? 'opacity-50 cursor-not-allowed'
										: isDark
										? 'bg-blue-600 hover:bg-blue-700 text-white'
										: 'bg-blue-500 hover:bg-blue-600 text-white'
								}`}
							>
								{isApplying ? '⏳ Applying...' : '✅ Apply Change'}
							</button>
						)}

						{diff.applied && (
							<div className="ml-auto flex items-center gap-2 px-3 text-sm text-green-500">
								<CheckCircle size={16} />
								<span>Applied at {diff.appliedAt}</span>
							</div>
						)}
					</div>

					{/* Metadata */}
					<div className={`px-4 py-2 text-xs opacity-50 border-t ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
						<details>
							<summary className="cursor-pointer hover:opacity-75">View Metadata</summary>
							<div className="mt-2 space-y-1 font-mono">
								<div>ID: {diff.id}</div>
								<div>Path: {diff.filePath}</div>
								<div>Language: {diff.language}</div>
								<div>
									Size: {diff.oldCode.length} → {diff.newCode.length} bytes
								</div>
							</div>
						</details>
					</div>
				</div>
			)}
		</div>
	);
};

export default CodeDiffPreview;
