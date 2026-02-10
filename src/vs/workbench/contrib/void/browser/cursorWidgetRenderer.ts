/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IOverlayWidget, ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IRange } from '../../../../editor/common/core/range.js';

/**
 * Cursor Widget using VS Code Overlay Widget API
 * Provides proper cursor rendering with animations and smooth transitions
 */

export interface ICursorWidgetRenderingService {
	readonly _serviceBrand: undefined;
	createCursorWidget(editor: ICodeEditor, userId: string, userName: string, color: string): RemoteCursorWidget;
	updateCursorPosition(widget: RemoteCursorWidget, line: number, character: number, selectionRange?: IRange): void;
	removeCursorWidget(widget: RemoteCursorWidget): void;
}

export class RemoteCursorWidget extends Disposable implements IOverlayWidget {
	private readonly id: string;
	private readonly domNode: HTMLElement;
	private readonly labelNode: HTMLElement;
	private readonly cursorLineNode: HTMLElement;
	private readonly selectionNode: HTMLElement;
	private editor: ICodeEditor;
	private currentPosition: { line: number; character: number } | null = null;
	// private selectionRange: IRange | null = null; // Not currently used
	private isVisible = true;
	private readonly userId: string;
	private readonly userName: string;
	private color: string;

	constructor(
		editor: ICodeEditor,
		userId: string,
		userName: string,
		color: string
	) {
		super();
		this.editor = editor;
		this.userId = userId;
		this.userName = userName;
		this.color = color;
		this.id = `remote-cursor-${userId}`;

		// Main container
		this.domNode = document.createElement('div');
		this.domNode.id = this.id;
		this.domNode.className = 'remote-cursor-widget';
		this.domNode.setAttribute('data-user-id', this.userId);
		this.domNode.style.cssText = `
			position: absolute;
			pointer-events: none;
			will-change: transform;
		`;

		// Selection highlight (optional)
		this.selectionNode = document.createElement('div');
		this.selectionNode.className = 'remote-cursor-selection';
		this.selectionNode.style.cssText = `
			position: absolute;
			background-color: ${this.color}20;
			border: 1px solid ${this.color}40;
			pointer-events: none;
		`;
		this.domNode.appendChild(this.selectionNode);

		// Cursor line
		this.cursorLineNode = document.createElement('div');
		this.cursorLineNode.className = 'remote-cursor-line';
		this.cursorLineNode.style.cssText = `
			position: absolute;
			width: 2px;
			height: 20px;
			background-color: ${this.color};
			box-shadow: 0 0 4px ${this.color}, 0 0 8px ${this.color}80;
			animation: cursor-blink 1s infinite;
			left: 0;
			top: 0;
		`;

		// Add CSS animation
		if (!document.querySelector('style[data-cursor-animation]')) {
			const style = document.createElement('style');
			style.setAttribute('data-cursor-animation', 'true');
			style.textContent = `
				@keyframes cursor-blink {
					0%, 49% { opacity: 1; }
					50%, 100% { opacity: 0.3; }
				}

				@keyframes cursor-fade-in {
					from { opacity: 0; transform: scale(0.8); }
					to { opacity: 1; transform: scale(1); }
				}

				@keyframes cursor-move {
					from { opacity: 0.5; }
					to { opacity: 1; }
				}

				.remote-cursor-widget {
					transition: transform 0.15s ease-out;
				}

				.remote-cursor-widget.new {
					animation: cursor-fade-in 0.3s ease-out;
				}

				.remote-cursor-label {
					position: absolute;
					background-color: var(--cursor-color, #888);
					color: white;
					padding: 2px 6px;
					border-radius: 3px;
					font-size: 11px;
					font-weight: 500;
					white-space: nowrap;
					top: -22px;
					left: 0;
					z-index: 1001;
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
					user-select: none;
				}

				.remote-cursor-line {
					animation: cursor-blink 1s infinite;
				}
			`;
			document.head.appendChild(style);
		}

		this.domNode.style.setProperty('--cursor-color', this.color);

		// Label
		this.labelNode = document.createElement('div');
		this.labelNode.className = 'remote-cursor-label';
		this.labelNode.textContent = this.userName;
		this.labelNode.style.backgroundColor = this.color;
		this.domNode.appendChild(this.labelNode);

		// Add cursor line
		this.domNode.appendChild(this.cursorLineNode);

		// Register with editor
		editor.addOverlayWidget(this);
	}

	getId(): string {
		return this.id;
	}

	getDomNode(): HTMLElement {
		return this.domNode;
	}

	getPosition(): any {
		// TODO: Define IOverlayWidgetPositionPreference type
		if (!this.currentPosition) {
			return null;
		}

		// Convert to editor position (1-indexed)
		const position = {
			lineNumber: this.currentPosition.line + 1,
			column: this.currentPosition.character + 1,
		};

		return {
			preference: [1, 2], // EXACT then BELOW
			...position,
		};
	}

	updatePosition(line: number, character: number, selectionRange?: IRange): void {
		this.currentPosition = { line, character };
		// this.selectionRange = selectionRange || null; // Property doesn't exist

		// Trigger layout update
		(this.editor as any).layoutOverlayWidget?.();

		// Update selection visualization if provided
		if (selectionRange) {
			this.updateSelectionDisplay(selectionRange);
		}
	}

	private updateSelectionDisplay(range: IRange): void {
		// Hide selection node for now (would need more context to calculate position)
		this.selectionNode.style.display = 'none';
	}

	show(): void {
		if (!this.isVisible) {
			this.isVisible = true;
			this.domNode.style.display = '';
		}
	}

	hide(): void {
		if (this.isVisible) {
			this.isVisible = false;
			this.domNode.style.display = 'none';
		}
	}

	updateColor(newColor: string): void {
		this.cursorLineNode.style.backgroundColor = newColor;
		this.cursorLineNode.style.boxShadow = `0 0 4px ${newColor}, 0 0 8px ${newColor}80`;
		this.labelNode.style.backgroundColor = newColor;
		this.domNode.style.setProperty('--cursor-color', newColor);
	}

	override dispose(): void {
		try {
			this.editor.removeOverlayWidget(this);
		} catch (error) {
			console.warn('[CursorWidget] Error removing widget:', error);
		}
		super.dispose();
	}
}

/**
 * Cursor Widget Rendering Service
 * Manages creation, updating, and disposal of remote cursor widgets
 */
export class CursorWidgetRenderingService extends Disposable implements ICursorWidgetRenderingService {
	readonly _serviceBrand: undefined;

	private widgetCache: Map<string, RemoteCursorWidget> = new Map();

	constructor() {
		super();
	}

	/**
	 * Create a new cursor widget for a remote user
	 */
	createCursorWidget(
		editor: ICodeEditor,
		userId: string,
		userName: string,
		color: string
	): RemoteCursorWidget {
		// Remove old widget if exists
		const existing = this.widgetCache.get(userId);
		if (existing) {
			existing.dispose();
		}

		// Create new widget
		const widget = new RemoteCursorWidget(editor, userId, userName, color);
		this.widgetCache.set(userId, widget);

		// Mark as new for animation
		widget.getDomNode().classList.add('new');
		setTimeout(() => {
			widget.getDomNode().classList.remove('new');
		}, 300);

		console.log(`[CursorWidget] Created widget for ${userName} (${userId})`);
		return widget;
	}

	/**
	 * Update cursor position with smooth animation
	 */
	updateCursorPosition(
		widget: RemoteCursorWidget,
		line: number,
		character: number,
		selectionRange?: IRange
	): void {
		// Add transition class for smooth movement
		const domNode = widget.getDomNode();
		domNode.style.transition = 'transform 0.15s ease-out';

		widget.updatePosition(line, character, selectionRange);

		// Reset transition after movement
		setTimeout(() => {
			domNode.style.transition = '';
		}, 150);
	}

	/**
	 * Remove a cursor widget
	 */
	removeCursorWidget(widget: RemoteCursorWidget): void {
		const userId = widget.getDomNode().getAttribute('data-user-id');
		if (userId) {
			this.widgetCache.delete(userId);
		}
		widget.dispose();
		console.log(`[CursorWidget] Removed widget for ${userId}`);
	}

	/**
	 * Get widget by user ID
	 */
	getWidget(userId: string): RemoteCursorWidget | undefined {
		return this.widgetCache.get(userId);
	}

	/**
	 * Get all widgets
	 */
	getAllWidgets(): RemoteCursorWidget[] {
		return Array.from(this.widgetCache.values());
	}

	/**
	 * Remove all widgets
	 */
	clearAllWidgets(): void {
		for (const widget of this.widgetCache.values()) {
			widget.dispose();
		}
		this.widgetCache.clear();
		console.log('[CursorWidget] Cleared all widgets');
	}

	override dispose(): void {
		this.clearAllWidgets();
		super.dispose();
	}
}

export const ICursorWidgetRenderingService = createDecorator<ICursorWidgetRenderingService>('cursorWidgetRenderingService');
