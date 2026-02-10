/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { showCreateRoomDialog, showJoinRoomDialog } from './dialogs/collaborationDialogs.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import './media/collaboration.css';
import { getActiveWindow, isHTMLElement, disposableWindowInterval } from '../../../../base/browser/dom.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions, IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainerLocation } from '../../../common/views.js';
import { CollaborationViewPane } from './collaborationViewPane.js';
import { supabaseService } from './supabaseService.js';
import { collaborationState } from './collaborationState.js';
import { websocketService } from './websocketService.js';

// Register collaboration icon - using combine icon to distinguish from profile
const collaborationIcon = registerIcon('collaboration-icon', Codicon.combine, localize('collaborationIcon', 'Collaboration'));

// View constants
const COLLABORATION_VIEWLET_ID = 'workbench.view.collaboration';
const COLLABORATION_VIEW_ID = 'workbench.collaboration.view';

// Register view container in sidebar
const viewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: COLLABORATION_VIEWLET_ID,
	title: localize2('collaboration', "Collaboration"),
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [COLLABORATION_VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }]),
	hideIfEmpty: false,
	icon: collaborationIcon,
	order: 5,
}, ViewContainerLocation.Sidebar, { doNotRegisterOpenCommand: true });

// Register collaboration view
const viewDescriptor: IViewDescriptor = {
	id: COLLABORATION_VIEW_ID,
	containerIcon: collaborationIcon,
	name: localize2('collaboration', "Collaboration"),
	ctorDescriptor: new SyncDescriptor(CollaborationViewPane),
	canToggleVisibility: true,
	canMoveView: true,
	openCommandActionDescriptor: {
		id: COLLABORATION_VIEWLET_ID,
		mnemonicTitle: localize({ key: 'miViewCollaboration', comment: ['&& denotes a mnemonic'] }, "&&Collaboration"),
		keybindings: {
			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF,
			when: ContextKeyExpr.regex('neverMatch', /doesNotMatch/)
		},
		order: 5
	}
};

// Register view
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);


/**
 * Command: Start Collaboration as Host
 */
registerAction2(class StartCollaborationAsHostAction extends Action2 {
	public static readonly ID = 'collaboration.startAsHost';
	public static readonly LABEL = 'Start Collaboration (Create Room)';

	constructor() {
		super({
			id: StartCollaborationAsHostAction.ID,
			title: localize2('startCollaboration', 'Start Collaboration (Create Room)'),
			category: Categories.File,
			f1: true,
			menu: [
				{
					id: MenuId.EditorContext,
					group: '9_zzz_collaboration',
					order: 1
				},
				{
					id: MenuId.CommandPalette,
					group: '',
					order: 1
				}
			]
		});
	}

	public async run(accessor: ServicesAccessor): Promise<void> {
		const notificationService = accessor.get(INotificationService);
		const workspaceService = accessor.get(IWorkspaceContextService);

		try {
			const result = await showCreateRoomDialog();
			if (!result) {
				return;
			}

			// Get all workspace folders
			const workspace = workspaceService.getWorkspace();
			const workspaceFolders = workspace.folders;

			// Use the first workspace folder name, or 'Workspace'
			let workspaceDisplayName = 'Workspace';
			let workspacePath = '';

			if (workspaceFolders.length > 0) {
				const firstFolder = workspaceFolders[0];
				workspaceDisplayName = firstFolder.name;
				workspacePath = firstFolder.uri.fsPath;
			}

			// Create P2P room via backend signaling
			const hostId = Math.random().toString(36).substring(2, 11);
			const room = await supabaseService.createRoom(result.roomName, result.userName, hostId, workspacePath);

			// Update global state
			collaborationState.startSession({
				room,
				userId: hostId,
				userName: result.userName,
				isHost: true,
				startedAt: new Date()
			});

			// Connect WebSocket for real-time sync
			try {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				const host = (window as any).__COLLABORATION_BACKEND_HOST__ || window.location.host;
				const wsUrl = `${protocol}//${host}`;
				await websocketService.connect(wsUrl, room.roomId, hostId, result.userName);

				// Send room creation data to WebSocket server with workspace path
				websocketService.sendRoomCreationData(result.roomName, workspacePath, '', 0);

				notificationService.info(
					`✅ Collaboration room created: ${result.roomName}\n📋 Room ID: ${room.roomId}\n📁 Workspace: ${workspaceDisplayName}\n👤 Host: ${result.userName}\n🔌 Connected for real-time sync`
				);
			} catch (wsError) {
				console.warn('WebSocket connection failed, operations will be stored but not synced in real-time:', wsError);
				notificationService.warn(
					`⚠️ Collaboration room created but real-time sync unavailable\n📋 Room ID: ${room.roomId}`
				);
			}
		} catch (error) {
			notificationService.error(`Failed to start collaboration: ${error}`);
		}
	}
});

/**
 * Command: Join Collaboration as Guest
 */
registerAction2(class JoinCollaborationAsGuestAction extends Action2 {
	public static readonly ID = 'collaboration.joinAsGuest';
	public static readonly LABEL = 'Join Collaboration (Join Room)';

	constructor() {
		super({
			id: JoinCollaborationAsGuestAction.ID,
			title: localize2('joinCollaboration', 'Join Collaboration (Join Room)'),
			category: Categories.File,
			f1: true,
			menu: [
				{
					id: MenuId.EditorContext,
					group: '9_zzz_collaboration',
					order: 2
				},
				{
					id: MenuId.CommandPalette,
					group: '',
					order: 2
				}
			]
		});
	}

	public async run(accessor: ServicesAccessor): Promise<void> {
		const notificationService = accessor.get(INotificationService);

		try {
			const result = await showJoinRoomDialog();
			if (!result) {
				return;
			}

			// Join room in Supabase
			const userId = Math.random().toString(36).substring(2, 11);
			const room = await supabaseService.joinRoom(result.sessionId, userId, result.userName);

			// Update global state
			collaborationState.startSession({
				room,
				userId,
				userName: result.userName,
				isHost: false,
				startedAt: new Date()
			});

			// Connect WebSocket for real-time sync
			try {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				const host = (window as any).__COLLABORATION_BACKEND_HOST__ || window.location.host;
				const wsUrl = `${protocol}//${host}`;
				await websocketService.connect(wsUrl, room.roomId, userId, result.userName);

				// Send join-room with full room data to ensure backend creates room in memory
				// This mirrors the startAsHost flow and allows guests to sync properly
				websocketService.sendRoomCreationData(
					room.name || 'Collaboration Room',
					room.fileId || 'default',
					room.content || '',
					room.version || 0
				); notificationService.info(`✅ Joined collaboration room: ${room.name}\n👤 Joined as: ${result.userName}\n🔌 Connected for real-time sync`);
			} catch (wsError) {
				console.warn('WebSocket connection failed:', wsError);
				notificationService.warn(
					`⚠️ Joined room but real-time sync unavailable\n👤 Joined as: ${result.userName}`
				);
			}
		} catch (error) {
			notificationService.error(`Failed to join collaboration: ${error}`);
		}
	}
});

/**
 * Command: End Collaboration
 */
registerAction2(class EndCollaborationAction extends Action2 {
	public static readonly ID = 'collaboration.end';
	public static readonly LABEL = 'End Collaboration';

	constructor() {
		super({
			id: EndCollaborationAction.ID,
			title: localize2('endCollaboration', 'End Collaboration'),
			category: Categories.File,
			f1: true,
			menu: [
				{
					id: MenuId.EditorContext,
					group: '9_zzz_collaboration',
					order: 3
				},
				{
					id: MenuId.CommandPalette,
					group: '',
					order: 3
				}
			]
		});
	}

	public async run(accessor: ServicesAccessor): Promise<void> {
		const notificationService = accessor.get(INotificationService);

		try {
			const session = collaborationState.getActiveSession();
			if (!session) {
				notificationService.warn('No active collaboration session to end');
				return;
			}

			// End P2P session via backend
			await supabaseService.endSession(session.room.roomId);

			// Disconnect WebSocket
			websocketService.disconnect();

			// Update global state
			collaborationState.endSession();

			notificationService.info('✅ Collaboration session ended');
		} catch (error) {
			notificationService.error(`Failed to end collaboration: ${error}`);
		}
	}
});

// Disable clicks on the Activity Bar entry for the collaboration view.
// The activity bar entry contains a `codicon-collaboration-icon` element; we
// find its ancestor action item/button and disable pointer events and keyboard
// focus to make the sidebar icon unclickable while keeping it visible.
const tryDisableCollabActivityEntry = (): boolean => {
	const activeWindow = getActiveWindow();
	const doc = activeWindow.document;
	const icon = doc.querySelector('.codicon.codicon-collaboration-icon');
	if (!icon) {
		return false;
	}

	const parent = (icon as Element).closest('.action-item, button, .monaco-action-bar .action-item, .composite-bar .action-item, .activitybar .action-item');
	if (parent && isHTMLElement(parent)) {
		parent.style.pointerEvents = 'none';
		parent.setAttribute('aria-disabled', 'true');
		try {
			(parent as HTMLElement).tabIndex = -1;
		} catch {
			// ignore
		}
		return true;
	}

	return false;
};

// Poll using the disposableWindowInterval helper tied to the active window so
// we avoid direct global timer usage and support multi-window scenarios.
disposableWindowInterval(getActiveWindow(), () => tryDisableCollabActivityEntry(), 200, 20);
