/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from '../../../../nls.js';

// Import the effects we need
import { Color } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';


export const foreground = registerColor('foreground',
	{ dark: '#FFFFFF', light: '#0e0e0eff', hcDark: '#FFFFFF', hcLight: '#000000' },
	nls.localize('foreground', "Overall foreground color. This color is only used if not overridden by a component."));

export const disabledForeground = registerColor('disabledForeground',
	{ dark: '#7A8FA380', light: '#2C3E5080', hcDark: '#A5A5A5', hcLight: '#7F7F7F' },
	nls.localize('disabledForeground', "Overall foreground for disabled elements. This color is only used if not overridden by a component."));

export const errorForeground = registerColor('errorForeground',
	{ dark: '#F48771', light: '#A1260D', hcDark: '#F48771', hcLight: '#B5200D' },
	nls.localize('errorForeground', "Overall foreground color for error messages. This color is only used if not overridden by a component."));

export const descriptionForeground = registerColor('descriptionForeground',
	{ light: '#141414ff', dark: transparent(foreground, 0.7), hcDark: transparent(foreground, 0.7), hcLight: transparent(foreground, 0.7) },
	nls.localize('descriptionForeground', "Foreground color for description text providing additional information, for example for a label."));

export const iconForeground = registerColor('icon.foreground',
	{ dark: '#FFFFFF', light: 'rgba(17, 17, 17, 1)ff', hcDark: '#FFFFFF', hcLight: '#000000' },
	nls.localize('iconForeground', "The default color for icons in the workbench."));

export const focusBorder = registerColor('focusBorder',
	{ dark: '#0d2bd7ff', light: '#0d3cd7ff', hcDark: '#F38518', hcLight: '#0F4A87' },
	nls.localize('focusBorder', "Overall border color for focused elements. This color is only used if not overridden by a component."));

export const contrastBorder = registerColor('contrastBorder',
	{ light: null, dark: null, hcDark: '#6FC3DF', hcLight: '#0f2585ff' },
	nls.localize('contrastBorder', "An extra border around elements to separate them from others for greater contrast."));

export const activeContrastBorder = registerColor('contrastActiveBorder',
	{ light: null, dark: null, hcDark: focusBorder, hcLight: focusBorder },
	nls.localize('activeContrastBorder', "An extra border around active elements to separate them from others for greater contrast."));

export const selectionBackground = registerColor('selection.background',
	null,
	nls.localize('selectionBackground', "The background color of text selections in the workbench (e.g. for input fields or text areas). Note that this does not apply to selections within the editor."));


// ------ text link

export const textLinkForeground = registerColor('textLink.foreground',
	{ light: '#0029b1ff', dark: '#0d3cd7ff', hcDark: '#2142ffff', hcLight: '#0F4A85' },
	nls.localize('textLinkForeground', "Foreground color for links in text."));

export const textLinkActiveForeground = registerColor('textLink.activeForeground',
	{ light: '#0029b1ff', dark: '#0d3cd7ff', hcDark: '#2142ffff', hcLight: '#0F4A85' },
	nls.localize('textLinkActiveForeground', "Foreground color for links in text when clicked on and on mouse hover."));

export const textSeparatorForeground = registerColor('textSeparator.foreground',
	{ light: '#0000002e', dark: '#2726262e', hcDark: Color.black, hcLight: '#161515ff' },
	nls.localize('textSeparatorForeground', "Color for text separators."));


// ------ text preformat

export const textPreformatForeground = registerColor('textPreformat.foreground',
	{ light: '#A31515', dark: '#D7BA7D', hcDark: '#000000', hcLight: '#FFFFFF' },
	nls.localize('textPreformatForeground', "Foreground color for preformatted text segments."));

export const textPreformatBackground = registerColor('textPreformat.background',
	{ light: '#0000001A', dark: '#FFFFFF1A', hcDark: '#FFFFFF', hcLight: '#09345f' },
	nls.localize('textPreformatBackground', "Background color for preformatted text segments."));


// ------ text block quote

export const textBlockQuoteBackground = registerColor('textBlockQuote.background',
	{ light: '#f2f2f2', dark: '#222222', hcDark: null, hcLight: '#F2F2F2' },
	nls.localize('textBlockQuoteBackground', "Background color for block quotes in text."));

export const textBlockQuoteBorder = registerColor('textBlockQuote.border',
	{ light: '#1b5bfa80', dark: '#1b5bfa80', hcDark: Color.white, hcLight: '#141414ff' },
	nls.localize('textBlockQuoteBorder', "Border color for block quotes in text."));


// ------ text code block

export const textCodeBlockBackground = registerColor('textCodeBlock.background',
	{ light: '#dcdcdc66', dark: '#0a0a0a66', hcDark: Color.black, hcLight: '#F2F2F2' },
	nls.localize('textCodeBlockBackground', "Background color for code blocks in text."));
