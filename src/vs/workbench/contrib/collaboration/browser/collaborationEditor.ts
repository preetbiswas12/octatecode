/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { CollaborationManager } from './collaborationManager.js';
import { showCreateRoomDialog, showJoinRoomDialog } from './dialogs/collaborationDialogs.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';

/**
 * Service for managing collaborative editing sessions
 */
export class CollaborationEditorService {
	private _managers: Map<string, CollaborationManager> = new Map();

	constructor(
		private _notificationService: INotificationService
	) { }

	/**
	 * Get or create collaboration manager for an editor
	 */
	public getManager(editor: ICodeEditor, serverId: string = 'localhost:3001'): CollaborationManager {
		const editorId = this._getEditorId(editor);
		if (!this._managers.has(editorId)) {
			const manager = new CollaborationManager(editor, serverId);
			this._managers.set(editorId, manager);
		}
		return this._managers.get(editorId)!;
	}

	/**
	 * Start collaboration as host
	 */
	public async startAsHost(editor: ICodeEditor, serverId?: string): Promise<void> {
		try {
			const result = await showCreateRoomDialog();
			if (!result) {
				return;
			}

			const manager = this.getManager(editor, serverId);
			const fileId = this._getFileId(editor);

			await manager.startAsHost(result.roomName, fileId, result.userName);

			this._notificationService.info(
				`Collaboration room created: ${result.roomName}\nShare room ID: ${manager.getSession()?.sessionId}`
			);
		} catch (error) {
			this._notificationService.error(`Failed to start collaboration: ${error}`);
		}
	}

	/**
	 * Join collaboration as guest
	 */
	public async joinAsGuest(editor: ICodeEditor, serverId?: string): Promise<void> {
		try {
			const result = await showJoinRoomDialog();
			if (!result) {
				return;
			}

			const manager = this.getManager(editor, serverId);
			await manager.joinAsGuest(result.sessionId, result.userName);

			this._notificationService.info(`Joined collaboration room as ${result.userName}`);
		} catch (error) {
			this._notificationService.error(`Failed to join collaboration: ${error}`);
		}
	}

	/**
	 * End collaboration session
	 */
	public endCollaboration(editor: ICodeEditor): void {
		const editorId = this._getEditorId(editor);
		const manager = this._managers.get(editorId);
		if (manager) {
			manager.endCollaboration();
			this._managers.delete(editorId);
			this._notificationService.info('Collaboration session ended');
		}
	}

	/**
	 * Get editor ID for manager tracking
	 */
	private _getEditorId(editor: ICodeEditor): string {
		return editor.getId ? editor.getId() : 'default';
	}

	/**
	 * Get file ID from editor
	 */
	private _getFileId(editor: ICodeEditor): string {
		const model = editor.getModel();
		if (model) {
			// Try to get file URI
			const uri = (model as any).uri;
			if (uri) {
				return uri.toString();
			}
		}
		return `file-${Date.now()}`;
	}

	/**
	 * Dispose all managers
	 */
	public dispose(): void {
		for (const manager of this._managers.values()) {
			manager.dispose();
		}
		this._managers.clear();
	}
}

/**
 * Command: Start Collaboration as Host
 */
export class StartCollaborationAsHostAction extends Action2 {
	public static readonly ID = 'collaboration.startAsHost';
	public static readonly LABEL = 'Start Collaboration (Create Room)';

	constructor(
		private _collaborationService: CollaborationEditorService
	) {
		super({
			id: StartCollaborationAsHostAction.ID,
			title: StartCollaborationAsHostAction.LABEL,
			menu: [
				{
					id: MenuId.EditorContext,
					group: 'z_commands'
				}
			]
		});
	}

	public run(accessor: any, editor?: ICodeEditor): Promise<void> {
		if (!editor) {
			editor = accessor.get('editor.ICodeEditor');
		}
		if (editor) {
			return this._collaborationService.startAsHost(editor);
		}
		return Promise.resolve();
	}
}

/**
 * Command: Join Collaboration as Guest
 */
export class JoinCollaborationAsGuestAction extends Action2 {
	public static readonly ID = 'collaboration.joinAsGuest';
	public static readonly LABEL = 'Join Collaboration (Join Room)';

	constructor(
		private _collaborationService: CollaborationEditorService
	) {
		super({
			id: JoinCollaborationAsGuestAction.ID,
			title: JoinCollaborationAsGuestAction.LABEL,
			menu: [
				{
					id: MenuId.EditorContext,
					group: 'z_commands'
				}
			]
		});
	}

	public run(accessor: any, editor?: ICodeEditor): Promise<void> {
		if (!editor) {
			editor = accessor.get('editor.ICodeEditor');
		}
		if (editor) {
			return this._collaborationService.joinAsGuest(editor);
		}
		return Promise.resolve();
	}
}

/**
 * Command: End Collaboration
 */
export class EndCollaborationAction extends Action2 {
	public static readonly ID = 'collaboration.end';
	public static readonly LABEL = 'End Collaboration';

	constructor(
		private _collaborationService: CollaborationEditorService
	) {
		super({
			id: EndCollaborationAction.ID,
			title: EndCollaborationAction.LABEL,
			menu: [
				{
					id: MenuId.EditorContext,
					group: 'z_commands'
				}
			]
		});
	}

	public run(accessor: any, editor?: ICodeEditor): void {
		if (!editor) {
			editor = accessor.get('editor.ICodeEditor');
		}
		if (editor) {
			this._collaborationService.endCollaboration(editor);
		}
	}
}
