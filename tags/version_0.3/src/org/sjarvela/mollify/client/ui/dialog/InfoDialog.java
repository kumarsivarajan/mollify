/**
 * Copyright (c) 2008- Samuli Järvelä
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
 * this entire header must remain intact.
 */

package org.sjarvela.mollify.client.ui.dialog;

import org.sjarvela.mollify.client.localization.Localizator;
import org.sjarvela.mollify.client.ui.StyleConstants;

import com.google.gwt.user.client.ui.ClickListener;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.Widget;

public class InfoDialog extends CenteredDialog {
	private Localizator localizator;
	private String text;
	private String type;

	public InfoDialog(Localizator localizator, String title, String text,
			String type) {
		super(title, StyleConstants.INFO_DIALOG, type);
		this.localizator = localizator;
		this.text = text;
		this.type = type;

		initialize();
	}

	@Override
	Widget createContent() {
		HorizontalPanel content = new HorizontalPanel();
		content.addStyleName(StyleConstants.INFO_DIALOG_CONTENT);

		Label icon = new Label();
		icon.addStyleName(StyleConstants.INFO_DIALOG_ICON);
		icon.addStyleName(type);
		content.add(icon);

		Label message = new Label(text);
		message.addStyleName(StyleConstants.INFO_DIALOG_MESSAGE);
		message.addStyleName(type);
		content.add(message);

		return content;
	}

	@Override
	Widget createButtons() {
		HorizontalPanel buttons = new HorizontalPanel();
		buttons.addStyleName(StyleConstants.INFO_DIALOG_BUTTONS);
		buttons.setHorizontalAlignment(HorizontalPanel.ALIGN_CENTER);

		buttons.add(createButton(localizator.getStrings().infoDialogOKButton(),
				new ClickListener() {
					public void onClick(Widget sender) {
						InfoDialog.this.hide();
					}
				}, type));

		return buttons;
	}
}