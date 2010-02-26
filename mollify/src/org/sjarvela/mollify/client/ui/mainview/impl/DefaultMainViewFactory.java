/**
 * Copyright (c) 2008- Samuli Järvelä
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
 * this entire header must remain intact.
 */

package org.sjarvela.mollify.client.ui.mainview.impl;

import org.sjarvela.mollify.client.filesystem.FileSystemItem;
import org.sjarvela.mollify.client.filesystem.FileSystemItemProvider;
import org.sjarvela.mollify.client.filesystem.Folder;
import org.sjarvela.mollify.client.filesystem.handler.DirectoryHandler;
import org.sjarvela.mollify.client.filesystem.handler.FileSystemActionHandler;
import org.sjarvela.mollify.client.filesystem.handler.RenameHandler;
import org.sjarvela.mollify.client.localization.TextProvider;
import org.sjarvela.mollify.client.service.FileSystemService;
import org.sjarvela.mollify.client.service.ServiceProvider;
import org.sjarvela.mollify.client.session.SessionInfo;
import org.sjarvela.mollify.client.session.SessionManager;
import org.sjarvela.mollify.client.session.user.PasswordHandler;
import org.sjarvela.mollify.client.ui.ViewManager;
import org.sjarvela.mollify.client.ui.action.ActionDelegator;
import org.sjarvela.mollify.client.ui.dialog.DialogManager;
import org.sjarvela.mollify.client.ui.dnd.DragAndDropController;
import org.sjarvela.mollify.client.ui.dnd.DragAndDropManager;
import org.sjarvela.mollify.client.ui.dropbox.DropBox;
import org.sjarvela.mollify.client.ui.dropbox.DropBoxFactory;
import org.sjarvela.mollify.client.ui.fileitemcontext.filecontext.FileContextPopupFactory;
import org.sjarvela.mollify.client.ui.fileitemcontext.foldercontext.FolderContextPopupFactory;
import org.sjarvela.mollify.client.ui.fileupload.FileUploadDialogFactory;
import org.sjarvela.mollify.client.ui.folderselector.FolderSelectorFactory;
import org.sjarvela.mollify.client.ui.itemselector.ItemSelectorFactory;
import org.sjarvela.mollify.client.ui.mainview.CreateFolderDialogFactory;
import org.sjarvela.mollify.client.ui.mainview.MainView;
import org.sjarvela.mollify.client.ui.mainview.MainViewFactory;
import org.sjarvela.mollify.client.ui.mainview.RenameDialogFactory;
import org.sjarvela.mollify.client.ui.password.PasswordDialog;
import org.sjarvela.mollify.client.ui.password.PasswordDialogFactory;
import org.sjarvela.mollify.client.ui.permissions.PermissionEditorViewFactory;

import com.allen_sauer.gwt.dnd.client.DragContext;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.Widget;
import com.google.inject.Inject;
import com.google.inject.Singleton;

@Singleton
public class DefaultMainViewFactory implements MainViewFactory,
		RenameDialogFactory, CreateFolderDialogFactory {
	private final ServiceProvider serviceProvider;
	private final TextProvider textProvider;
	private final ViewManager viewManager;
	private final DialogManager dialogManager;
	private final SessionManager sessionManager;
	private final FileSystemItemProvider fileSystemItemProvider;
	private final ItemSelectorFactory itemSelectorFactory;
	private final PermissionEditorViewFactory permissionEditorViewFactory;
	private final FileUploadDialogFactory fileUploadDialogFactory;
	private final PasswordDialogFactory passwordDialogFactory;
	private final DropBoxFactory dropBoxFactory;
	private final DragAndDropManager dragAndDropManager;

	@Inject
	public DefaultMainViewFactory(TextProvider textProvider,
			ViewManager viewManager, DialogManager dialogManager,
			ServiceProvider serviceProvider, SessionManager sessionManager,
			FileSystemItemProvider fileSystemItemProvider,
			ItemSelectorFactory itemSelectorFactory,
			PermissionEditorViewFactory permissionEditorViewFactory,
			FileUploadDialogFactory fileUploadDialogFactory,
			PasswordDialogFactory passwordDialogFactory,
			DropBoxFactory dropBoxFactory, DragAndDropManager dragAndDropManager) {
		this.textProvider = textProvider;
		this.viewManager = viewManager;
		this.dialogManager = dialogManager;
		this.serviceProvider = serviceProvider;
		this.sessionManager = sessionManager;
		this.fileSystemItemProvider = fileSystemItemProvider;
		this.itemSelectorFactory = itemSelectorFactory;
		this.permissionEditorViewFactory = permissionEditorViewFactory;
		this.fileUploadDialogFactory = fileUploadDialogFactory;
		this.passwordDialogFactory = passwordDialogFactory;
		this.dropBoxFactory = dropBoxFactory;
		this.dragAndDropManager = dragAndDropManager;
	}

	public MainView createMainView() {
		SessionInfo session = sessionManager.getSession();

		FileSystemService fileSystemService = serviceProvider
				.getFileSystemService();
		MainViewModel model = new MainViewModel(fileSystemService, session,
				fileSystemItemProvider);

		FolderSelectorFactory directorySelectorFactory = new FolderSelectorFactory(
				model, fileSystemService, textProvider, fileSystemItemProvider);
		FileContextPopupFactory fileContextPopupFactory = new FileContextPopupFactory(
				fileSystemService, textProvider, session);
		FolderContextPopupFactory directoryContextPopupFactory = new FolderContextPopupFactory(
				textProvider, fileSystemService, session);
		ActionDelegator actionDelegator = new ActionDelegator();

		dragAndDropManager.addDragAndDropController(FileSystemItem.class,
				new DragAndDropController() {
					@Override
					public boolean useProxy() {
						return true;
					}

					@Override
					public Widget createProxy(DragContext context) {
						return new Label("TODO");
					}
				});

		FileSystemActionHandler fileSystemActionHandler = new DefaultFileSystemActionHandlerFactory(
				textProvider, viewManager, dialogManager, itemSelectorFactory,
				this, fileSystemService, fileSystemItemProvider).create();
		DropBox dropBox = dropBoxFactory.createDropBox(fileSystemActionHandler);

		DefaultMainView view = new DefaultMainView(model, textProvider,
				actionDelegator, directorySelectorFactory,
				fileContextPopupFactory, directoryContextPopupFactory,
				dragAndDropManager);
		MainViewPresenter presenter = new MainViewPresenter(dialogManager,
				viewManager, sessionManager, model, view, serviceProvider
						.getConfigurationService(), fileSystemService,
				textProvider, fileSystemActionHandler,
				permissionEditorViewFactory, passwordDialogFactory,
				fileUploadDialogFactory, this, dropBox);
		new MainViewGlue(view, presenter, fileSystemActionHandler,
				actionDelegator);

		return view;
	}

	public void openRenameDialog(FileSystemItem item, RenameHandler handler,
			Widget parent) {
		RenameDialog renameDialog = new RenameDialog(item, textProvider,
				handler);
		if (parent != null)
			renameDialog.alignWith(parent);
	}

	public void openPasswordDialog(PasswordHandler handler) {
		new PasswordDialog(textProvider, handler);
	}

	public void openCreateFolderDialog(Folder folder,
			DirectoryHandler directoryHandler) {
		new CreateFolderDialog(folder, textProvider, directoryHandler);
	}
}
