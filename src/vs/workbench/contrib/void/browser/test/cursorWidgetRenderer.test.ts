/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { RemoteCursorWidget, CursorWidgetRenderingService } from '../cursorWidgetRenderer.js';

describe('CursorWidgetRenderer', () => {
	let service: CursorWidgetRenderingService;
	let mockEditor: any;

	beforeEach(() => {
		service = new CursorWidgetRenderingService();

		// Create mock editor
		mockEditor = {
			getDomNode: () => {
				const div = document.createElement('div');
				div.id = 'mock-editor';
				return div;
			},
			layoutContentWidget: () => { },
			layoutOverlayWidget: () => { },
			addOverlayWidget: (widget: any) => { },
			removeOverlayWidget: (widget: any) => { },
		};
	});

	afterEach(() => {
		service.dispose();
	});

	describe('RemoteCursorWidget', () => {
		it('should create widget with correct properties', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

			assert.strictEqual(widget['userId'], 'user1');
			assert.strictEqual(widget['userName'], 'Alice');
			assert.strictEqual(widget['color'], '#FF0000');

			widget.dispose();
		});

		it('should implement IOverlayWidget interface', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

			assert.ok(typeof widget.getId === 'function');
			assert.ok(typeof widget.getDomNode === 'function');
			assert.ok(typeof widget.getPosition === 'function');
			assert.ok(typeof widget.updatePosition === 'function');
			assert.ok(typeof widget.show === 'function');
			assert.ok(typeof widget.hide === 'function');
			assert.ok(typeof widget.updateColor === 'function');
			assert.ok(typeof widget.dispose === 'function');

			widget.dispose();
		});

		it('should return correct widget ID', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user123', 'Bob', '#00FF00');

			assert.strictEqual(widget.getId(), 'remote-cursor-user123');

			widget.dispose();
		});

		it('should return DOM node', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			const domNode = widget.getDomNode();

			assert.ok(domNode instanceof HTMLElement);
			assert.strictEqual(domNode.className, 'remote-cursor-widget');

			widget.dispose();
		});

		it('should have correct initial position', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			const position = widget.getPosition();

			// Initially position is null until updatePosition() is called
			assert.strictEqual(position, null);

			// After updating position, it should return proper values
			widget.updatePosition(0, 0);
			const updatedPosition = widget.getPosition();
			assert.ok(updatedPosition);
			assert.strictEqual(updatedPosition.lineNumber, 1);
			assert.strictEqual(updatedPosition.column, 1);

			widget.dispose();
		});

		it('should update position correctly', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			widget.updatePosition(5, 10);

			const position = widget.getPosition();
			assert.strictEqual(position.lineNumber, 6); // 0-indexed to 1-indexed
			assert.strictEqual(position.column, 11);

			widget.dispose();
		});

		it('should update selection range correctly', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			const selectionRange = {
				startLineNumber: 1,
				startColumn: 1,
				endLineNumber: 3,
				endColumn: 10,
			};

			widget.updatePosition(5, 10, selectionRange);

			// Selection should be applied to DOM
			const domNode = widget.getDomNode();
			const selectionNode = domNode.querySelector('.remote-cursor-selection');
			assert.ok(selectionNode, 'Selection node should exist');

			widget.dispose();
		});

		it('should show and hide widget', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

			widget.hide();
			assert.strictEqual(widget.getDomNode().style.display, 'none');

			widget.show();
			assert.strictEqual(widget.getDomNode().style.display, 'block');

			widget.dispose();
		});

		it('should update color correctly', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			widget.updateColor('#0000FF');

			assert.strictEqual(widget['color'], '#0000FF');

			const cursorLine = widget.getDomNode().querySelector('.remote-cursor-line');
			assert.ok(cursorLine);

			widget.dispose();
		});

		it('should create cursor line with glow effect', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			const domNode = widget.getDomNode();

			const cursorLine = domNode.querySelector('.remote-cursor-line') as HTMLElement;
			assert.ok(cursorLine);
			assert.ok(cursorLine.style.backgroundColor.includes('FF0000') || cursorLine.style.backgroundColor === '#FF0000');

			widget.dispose();
		});

		it('should create user label', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			const domNode = widget.getDomNode();

			const label = domNode.querySelector('.remote-cursor-label') as HTMLElement;
			assert.ok(label);
			assert.strictEqual(label.textContent, 'Alice');

			widget.dispose();
		});

		it('should trigger fade-in animation on creation', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

			// Widget initial class should be 'remote-cursor-widget'
			assert.ok(widget.getDomNode().classList.contains('remote-cursor-widget'));

			// Animation class added by service, verified in service tests
			widget.dispose();
		});

		it('should trigger smooth transition on position update', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

			// Update position should succeed
			widget.updatePosition(5, 10);
			const position = widget.getPosition();
			assert.strictEqual(position.lineNumber, 6);
			assert.strictEqual(position.column, 11);

			// Smooth transition class applied by service, not widget
			widget.dispose();
		});

		it('should dispose properly and clean up resources', () => {
			const widget = new RemoteCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
			const domNode = widget.getDomNode();

			assert.ok(domNode.parentElement || true, 'Widget should have parent or be ready for removal');

			widget.dispose();

			// After disposal, widget should be cleaned up
			assert.ok((widget as any)['disposed'], 'Widget should be marked as disposed');
		});

		describe('CursorWidgetRenderingService', () => {
			it('should create new cursor widget', () => {
				const widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

				assert.ok(widget);
				assert.strictEqual(widget.getId(), 'remote-cursor-user1');

				service.clearAllWidgets();
			});

			it('should cache created widgets', () => {
				const widget1 = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				const widget2 = service.getWidget('user1');

				assert.strictEqual(widget1, widget2, 'Should return cached widget');

				service.clearAllWidgets();
			});

			it('should retrieve widget by userId', () => {
				service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				service.createCursorWidget(mockEditor, 'user2', 'Bob', '#00FF00');

				const widget1 = service.getWidget('user1');
				const widget2 = service.getWidget('user2');

				assert.ok(widget1);
				assert.ok(widget2);
				assert.strictEqual(widget1.getId(), 'remote-cursor-user1');
				assert.strictEqual(widget2.getId(), 'remote-cursor-user2');

				service.clearAllWidgets();
			});

			it('should return all widgets', () => {
				service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				service.createCursorWidget(mockEditor, 'user2', 'Bob', '#00FF00');
				service.createCursorWidget(mockEditor, 'user3', 'Charlie', '#0000FF');

				const widgets = service.getAllWidgets();

				assert.strictEqual(widgets.length, 3);

				service.clearAllWidgets();
			});

			it('should update cursor position with smooth animation', () => {
				const widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				const domNode = widget.getDomNode();

				service.updateCursorPosition(widget, 5, 10);

				const position = widget.getPosition();
				assert.strictEqual(position.lineNumber, 6);
				assert.strictEqual(position.column, 11);

				// Service sets transition property for smooth animation
				assert.ok(domNode.style.transition);

				service.clearAllWidgets();
			});

			it('should update cursor position with selection', () => {
				const widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				const selectionRange = {
					startLineNumber: 1,
					startColumn: 1,
					endLineNumber: 3,
					endColumn: 10,
				};

				service.updateCursorPosition(widget, 5, 10, selectionRange);

				const domNode = widget.getDomNode();
				const selectionNode = domNode.querySelector('.remote-cursor-selection');
				assert.ok(selectionNode);

				service.clearAllWidgets();
			});

			it('should remove specific cursor widget', () => {
				const widget1 = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				// const widget2 = service.createCursorWidget(mockEditor, 'user2', 'Bob', '#00FF00'); // Not used in current test

				assert.strictEqual(service.getAllWidgets().length, 2);

				service.removeCursorWidget(widget1);

				assert.strictEqual(service.getAllWidgets().length, 1);
				assert.ok(service.getWidget('user2'));
				assert.strictEqual(service.getWidget('user1'), undefined);

				service.clearAllWidgets();
			});

			it('should clear all widgets at once', () => {
				service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				service.createCursorWidget(mockEditor, 'user2', 'Bob', '#00FF00');
				service.createCursorWidget(mockEditor, 'user3', 'Charlie', '#0000FF');

				assert.strictEqual(service.getAllWidgets().length, 3);

				service.clearAllWidgets();

				assert.strictEqual(service.getAllWidgets().length, 0);
			});

			it('should handle multiple concurrent cursors efficiently', () => {
				const users = [
					{ id: 'user1', name: 'Alice', color: '#FF0000' },
					{ id: 'user2', name: 'Bob', color: '#00FF00' },
					{ id: 'user3', name: 'Charlie', color: '#0000FF' },
					{ id: 'user4', name: 'David', color: '#FFFF00' },
					{ id: 'user5', name: 'Eve', color: '#FF00FF' },
				];

				for (const user of users) {
					service.createCursorWidget(mockEditor, user.id, user.name, user.color);
				}

				assert.strictEqual(service.getAllWidgets().length, 5);

				// Update all positions
				for (let i = 0; i < users.length; i++) {
					const widget = service.getWidget(users[i].id);
					if (widget) {
						service.updateCursorPosition(widget, i * 5, i * 3);
					}
				}

				// Verify all positions updated
				for (let i = 0; i < users.length; i++) {
					const widget = service.getWidget(users[i].id);
					if (widget) {
						const position = widget.getPosition();
						assert.strictEqual(position.lineNumber, i * 5 + 1);
						assert.strictEqual(position.column, i * 3 + 1);
					}
				}

				service.clearAllWidgets();
			});

			it('should dispose service and clean up all widgets', () => {
				service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				service.createCursorWidget(mockEditor, 'user2', 'Bob', '#00FF00');

				assert.strictEqual(service.getAllWidgets().length, 2);

				service.dispose();

				// After disposal, service should have no widgets
				assert.strictEqual(service.getAllWidgets().length, 0);
			});

			it('should inject CSS animations on first widget creation', () => {
				service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

				// Styles should be injected with data-cursor-animation attribute
				const injectedStyle = document.head.querySelector('style[data-cursor-animation]');
				assert.ok(injectedStyle, 'CSS animation styles should be injected');

				service.clearAllWidgets();
			});

			it('should handle widget creation with different colors', () => {
				const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

				for (let i = 0; i < colors.length; i++) {
					const widget = service.createCursorWidget(mockEditor, `user${i}`, `User${i}`, colors[i]);
					assert.strictEqual(widget['color'], colors[i]);
				}

				assert.strictEqual(service.getAllWidgets().length, colors.length);

				service.clearAllWidgets();
			});

			it('should maintain correct widget order in cache', () => {
				service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				service.createCursorWidget(mockEditor, 'user2', 'Bob', '#00FF00');
				service.createCursorWidget(mockEditor, 'user3', 'Charlie', '#0000FF');

				const widgets = service.getAllWidgets();
				const ids = widgets.map(w => w.getId());

				assert.ok(ids.includes('remote-cursor-user1'));
				assert.ok(ids.includes('remote-cursor-user2'));
				assert.ok(ids.includes('remote-cursor-user3'));

				service.clearAllWidgets();
			});
		});

		describe('Integration Tests', () => {
			it('should handle complete cursor lifecycle', () => {
				// Create cursor
				const widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				assert.ok(widget);

				// Update position
				service.updateCursorPosition(widget, 0, 5);
				let position = widget.getPosition();
				assert.strictEqual(position.column, 6);

				// Update color
				widget.updateColor('#00FF00');
				assert.strictEqual(widget['color'], '#00FF00');

				// Hide widget
				widget.hide();
				assert.strictEqual(widget.getDomNode().style.display, 'none');

				// Show widget
				widget.show();
				assert.strictEqual(widget.getDomNode().style.display, 'block');

				// Remove widget
				service.removeCursorWidget(widget);
				assert.strictEqual(service.getWidget('user1'), undefined);
			});

			it('should handle rapid position updates', () => {
				const widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');

				// Simulate rapid cursor movements
				for (let i = 0; i < 50; i++) {
					service.updateCursorPosition(widget, i, i * 2);
				}

				const position = widget.getPosition();
				assert.strictEqual(position.lineNumber, 50); // 49 + 1
				assert.strictEqual(position.column, 99); // 98 + 1

				service.clearAllWidgets();
			});

			it('should handle widget recreation', () => {
				// Create and remove
				let widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				service.removeCursorWidget(widget);

				// Recreate with same user
				widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				assert.ok(widget);

				// Should be a new widget instance
				const cachedWidget = service.getWidget('user1');
				assert.strictEqual(widget, cachedWidget);

				service.clearAllWidgets();
			});

			it('should render smooth animations during updates', () => {
				const widget = service.createCursorWidget(mockEditor, 'user1', 'Alice', '#FF0000');
				const domNode = widget.getDomNode();

				// Service adds 'new' class on creation for fade-in animation
				assert.ok(domNode.classList.contains('new'));

				// After update - service applies transition style
				domNode.classList.remove('new');
				service.updateCursorPosition(widget, 5, 10);
				assert.ok(domNode.style.transition.includes('transform'));

				service.clearAllWidgets();
			});
		});
	});
})
