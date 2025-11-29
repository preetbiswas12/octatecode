/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRemoteUser } from './collaborationTypes.js';
import { ICodeEditor, IContentWidget, ContentWidgetPositionPreference, IContentWidgetPosition } from '../../../../editor/browser/editorBrowser.js';
import { PresenceService } from './presenceService.js';

/**
 * Widget for rendering a remote user's cursor
 */
export class RemoteCursorWidget implements IContentWidget {
	private _user: IRemoteUser;
	private _domNode: HTMLElement | null = null;
	private _containerNode: HTMLElement;

	readonly allowEditorOverflow: boolean = false;
	readonly suppressMouseDown: boolean = false;

	get id(): string {
		return `remote-cursor-${this._user.userId}`;
	}

	getId(): string {
		return this.id;
	}

	constructor(user: IRemoteUser, private _editor: ICodeEditor) {
		this._user = user;
		this._containerNode = document.createElement('div');
		this._containerNode.className = 'remote-cursor-widget';
		this._createCursorElement();
	}

	private _createCursorElement(): void {
		this._domNode = document.createElement('div');
		this._domNode.className = 'remote-cursor';
		this._domNode.style.backgroundColor = this._user.color;
		this._domNode.style.width = '2px';
		this._domNode.style.height = '100%';
		this._domNode.style.position = 'absolute';
		this._domNode.style.opacity = '0.8';
		this._domNode.style.zIndex = '999';

		// Username label
		const label = document.createElement('div');
		label.className = 'remote-cursor-label';
		label.textContent = this._user.userName;
		label.style.backgroundColor = this._user.color;
		label.style.color = 'white';
		label.style.fontSize = '12px';
		label.style.padding = '2px 4px';
		label.style.borderRadius = '2px';
		label.style.marginTop = '-20px';
		label.style.position = 'absolute';
		label.style.whiteSpace = 'nowrap';
		label.style.pointerEvents = 'none';

		this._containerNode.appendChild(this._domNode);
		this._containerNode.appendChild(label);
	}

	public getDomNode(): HTMLElement {
		return this._containerNode;
	}

	public getPosition(): IContentWidgetPosition | null {
		if (!this._editor) {
			return null;
		}

		try {
			const pos = this._editor.getModel()?.getPositionAt(this._user.cursorPosition);
			if (pos) {
				return {
					position: pos,
					preference: [ContentWidgetPositionPreference.EXACT]
				};
			}
		} catch (error) {
			console.warn('Failed to get cursor position:', error);
		}

		return null;
	}

	public beforeRender(): any {
		// Called before rendering
		return null;
	}

	public afterRender(): void {
		// Called after rendering
	}

	/**
	 * Update user information
	 */
	public update(user: IRemoteUser): void {
		this._user = user;
		if (this._domNode) {
			this._domNode.style.backgroundColor = user.color;
		}
		this._editor.layoutContentWidget(this);
	}

	/**
	 * Dispose the widget
	 */
	public dispose(): void {
		if (this._containerNode && this._containerNode.parentElement) {
			this._containerNode.parentElement.removeChild(this._containerNode);
		}
	}
}

/**
 * Service for rendering and managing remote cursors in the editor
 */
export class CollaborationUIController {
	private _remoteCursors: Map<string, RemoteCursorWidget> = new Map();

	constructor(
		private _editor: ICodeEditor,
		private _presenceService: PresenceService
	) {
		this._setupPresenceListeners();
	}

	private _setupPresenceListeners(): void {
		this._presenceService.onUserAdded((user: IRemoteUser) => this.addRemoteUser(user));
		this._presenceService.onPresenceUpdated((user: IRemoteUser) => this.updateRemoteUser(user));
		this._presenceService.onUserRemoved((userId: string) => this.removeRemoteUser(userId));
	}

	/**
	 * Add a new remote user's cursor
	 */
	public addRemoteUser(user: IRemoteUser): void {
		if (!this._remoteCursors.has(user.userId)) {
			const widget = new RemoteCursorWidget(user, this._editor);
			this._remoteCursors.set(user.userId, widget);
			this._editor.addContentWidget(widget);
		}
	}

	/**
	 * Update a remote user's cursor position
	 */
	public updateRemoteUser(user: IRemoteUser): void {
		const widget = this._remoteCursors.get(user.userId);
		if (widget) {
			widget.update(user);
		}
	}

	/**
	 * Remove a remote user's cursor
	 */
	public removeRemoteUser(userId: string): void {
		const widget = this._remoteCursors.get(userId);
		if (widget) {
			widget.dispose();
			this._editor.removeContentWidget(widget);
			this._remoteCursors.delete(userId);
		}
	}

	/**
	 * Remove all remote cursors
	 */
	public removeAllRemoteCursors(): void {
		for (const [, widget] of this._remoteCursors) {
			widget.dispose();
			this._editor.removeContentWidget(widget);
		}
		this._remoteCursors.clear();
	}

	/**
	 * Get number of remote cursors
	 */
	public getRemoteCursorCount(): number {
		return this._remoteCursors.size;
	}

	/**
	 * Dispose all resources
	 */
	public dispose(): void {
		this.removeAllRemoteCursors();
	}
}
