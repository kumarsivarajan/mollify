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

import org.sjarvela.mollify.client.data.Directory;
import org.sjarvela.mollify.client.file.DirectoryHandler;
import org.sjarvela.mollify.client.localization.Localizator;
import org.sjarvela.mollify.client.service.ResultListener;
import org.sjarvela.mollify.client.ui.StyleConstants;

import com.google.gwt.user.client.ui.ClickListener;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.user.client.ui.Widget;

public class CreateFolderDialog extends CenteredDialog {
	private Localizator localizator;
	private TextBox name;
	private final ResultListener resultListener;
	private final DirectoryHandler directoryHandler;
	private final Directory parentFolder;

	public CreateFolderDialog(Directory parentFolder,
			DirectoryHandler directoryHandler, Localizator localizator,
			ResultListener resultListener) {
		super(localizator.getStrings().createFolderDialogTitle(),
				StyleConstants.CREATE_FOLDER_DIALOG);

		this.parentFolder = parentFolder;
		this.directoryHandler = directoryHandler;
		this.localizator = localizator;
		this.resultListener = resultListener;

		initialize();
	}

	@Override
	Widget createContent() {
		VerticalPanel panel = new VerticalPanel();
		panel.addStyleName(StyleConstants.CREATE_FOLDER_DIALOG_CONTENT);

		Label nameTitle = new Label(localizator.getStrings()
				.createFolderDialogName());
		nameTitle.setStyleName(StyleConstants.CREATE_FOLDER_DIALOG_NAME_TITLE);
		panel.add(nameTitle);

		name = new TextBox();
		name.addStyleName(StyleConstants.CREATE_FOLDER_DIALOG_NAME_VALUE);

		panel.add(name);

		return panel;
	}

	@Override
	Widget createButtons() {
		HorizontalPanel buttons = new HorizontalPanel();
		buttons.addStyleName(StyleConstants.CREATE_FOLDER_DIALOG_BUTTONS);
		buttons.setHorizontalAlignment(HorizontalPanel.ALIGN_CENTER);

		buttons.add(createButton(localizator.getStrings()
				.createFolderDialogCreateButton(), new ClickListener() {

			public void onClick(Widget sender) {
				onCreate();
			}
		}, StyleConstants.CREATE_FOLDER_DIALOG_BUTTON_CREATE));

		buttons.add(createButton(localizator.getStrings().dialogCancelButton(),
				new ClickListener() {

					public void onClick(Widget sender) {
						CreateFolderDialog.this.hide();
					}
				}, StyleConstants.DIALOG_BUTTON_CANCEL));

		return buttons;
	}

	@Override
	void onShow() {
		name.setFocus(true);
	}

	private void onCreate() {
		String folderName = name.getText();

		if (folderName.length() < 1) {
			name.setFocus(true);
			return;
		}

		this.hide();
		directoryHandler.onCreate(parentFolder, folderName, resultListener);
	}
}
