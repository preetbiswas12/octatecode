/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ICollaborationService } from './collaborationService.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { CursorUpdate } from '../common/collaborationServiceTypes.js';
import { CursorWidgetRenderingService, RemoteCursorWidget } from './cursorWidgetRenderer.js';

export interface ICursorTrackingService {
	readonly _serviceBrand: undefined;
	initialize(): void;
}

export const ICursorTrackingService = createDecorator<ICursorTrackingService>('cursorTrackingService');

interface RemoteCursor {
	userId: string;
	userName: string;
	color: string;
	line: number;
	character: number;
	selectionStart?: { line: number; character: number };
	selectionEnd?: { line: number; character: number };
	widget?: RemoteCursorWidget; // Overlay widget for cursor display
}

class CursorTrackingService extends Disposable implements ICursorTrackingService {
	readonly _serviceBrand: undefined;

	private remoteCursors: Map<string, RemoteCursor> = new Map();
	private syncDelayer = new ThrottledDelayer<void>(200);
	private currentEditor: any = null;
	private widgetRenderer = new CursorWidgetRenderingService();

	constructor(
		@ICollaborationService private collaborationService: ICollaborationService,
	) {
		super();
		this._register(this.widgetRenderer);
	}

	initialize(): void {
		// Listen for remote cursor updates
		const cursorUnsub = this.collaborationService.onCursorUpdate((cursor) => {
			try {
				this.updateRemoteCursor(cursor);
			} catch (error) {
				console.error('[CursorTracking] Error updating remote cursor:', error);
			}
		});
		this._register(toDisposable(() => cursorUnsub()));

		// Listen for peer presence changes
		const peerUnsub = this.collaborationService.onPeerPresence((peer) => {
			try {
				if (!peer.isOnline) {
					console.log(`[CursorTracking] Removing cursor for offline peer: ${peer.userId}`);
					this.removeCursor(peer.userId);
				}
			} catch (error) {
				console.error('[CursorTracking] Error handling peer presence:', error);
			}
		});
		this._register(toDisposable(() => peerUnsub()));

		// Listen for room changes (clear cursors when leaving room)
		const roomUnsub = this.collaborationService.onRoomChanged((room) => {
			if (!room) {
				console.log('[CursorTracking] Clearing all remote cursors (left room)');
				this.clearAllCursors();
			}
		});
		this._register(toDisposable(() => roomUnsub()));
	}

	// private attachEditorListeners(editor: any): void {
	// 	this.currentEditor = editor;

	// 	// Track cursor/selection changes
	// 	editor.onDidChangeCursorPosition(() => {
	// 		this.syncDelayer.trigger(async () => {
	// 			await this.broadcastCursorPosition();
	// 		}).catch((error) => {
	// 			console.warn('[CursorTracking] Error broadcasting cursor position:', error);
	// 		});
	// 	});

	// 	editor.onDidChangeCursorSelection(() => {
	// 		this.syncDelayer.trigger(async () => {
	// 			await this.broadcastCursorPosition();
	// 		}).catch((error) => {
	// 			console.warn('[CursorTracking] Error broadcasting cursor selection:', error);
	// 		});
	// 	});
	// }

	private updateRemoteCursor(cursor: CursorUpdate): void {
		if (!this.currentEditor) return;
		const currentFileUri = this.currentEditor.getModel()?.uri?.toString();
		if (!currentFileUri || cursor.fileUri !== currentFileUri) {
			return; // Different file - don't render cursor
		}

		const existing = this.remoteCursors.get(cursor.userId);
		const peers = this.collaborationService.getPeers();
		const peer = peers.find((p) => p.userId === cursor.userId);
		const color = peer?.color || '#888888';

		if (existing) {
			// Update existing cursor
			this.remoteCursors.set(cursor.userId, {
				...existing,
				line: cursor.line,
				character: cursor.character,
				selectionStart: cursor.selectionStart,
				selectionEnd: cursor.selectionEnd,
				color,
			});
		} else {
			// Create new cursor
			const userName = peer?.userName || 'Unknown';
			this.remoteCursors.set(cursor.userId, {
				userId: cursor.userId,
				userName,
				line: cursor.line,
				character: cursor.character,
				selectionStart: cursor.selectionStart,
				selectionEnd: cursor.selectionEnd,
				color,
			});
		}

		this.renderRemoteCursors();
	}

	private removeCursor(userId: string): void {
		const cursor = this.remoteCursors.get(userId);
		if (cursor?.widget) {
			try {
				this.widgetRenderer.removeCursorWidget(cursor.widget);
			} catch (error) {
				console.warn(`[CursorTracking] Error removing cursor widget for ${userId}:`, error);
			}
		}
		this.remoteCursors.delete(userId);
	}

	private clearAllCursors(): void {
		this.widgetRenderer.clearAllWidgets();
		this.remoteCursors.clear();
		console.log('[CursorTracking] All remote cursors cleared');
	}

	private renderRemoteCursors(): void {
		if (!this.currentEditor) return;

		// Update or create widgets for all cursors
		for (const [, cursor] of this.remoteCursors) {
			try {
				if (!cursor.widget) {
					// Create new widget
					cursor.widget = this.widgetRenderer.createCursorWidget(
						this.currentEditor,
						cursor.userId,
						cursor.userName,
						cursor.color
					);
				}

				// Update position with smooth animation
				const selectionRange = cursor.selectionStart && cursor.selectionEnd
					? {
						startLineNumber: cursor.selectionStart.line + 1,
						startColumn: cursor.selectionStart.character + 1,
						endLineNumber: cursor.selectionEnd.line + 1,
						endColumn: cursor.selectionEnd.character + 1,
					}
					: undefined;

				this.widgetRenderer.updateCursorPosition(
					cursor.widget,
					cursor.line,
					cursor.character,
					selectionRange
				);
			} catch (error) {
				console.warn('[CursorTracking] Error rendering cursor:', error);
			}
		}
	}

	override dispose(): void {
		this.syncDelayer.dispose();
		this.clearAllCursors();
		super.dispose();
	}
}

registerSingleton(ICursorTrackingService, CursorTrackingService, InstantiationType.Eager);
