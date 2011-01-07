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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.sjarvela.mollify.client.filesystem.File;
import org.sjarvela.mollify.client.filesystem.FileSystemItem;
import org.sjarvela.mollify.client.filesystem.FileSystemItemProvider;
import org.sjarvela.mollify.client.filesystem.Folder;
import org.sjarvela.mollify.client.filesystem.FolderInfo;
import org.sjarvela.mollify.client.filesystem.foldermodel.FolderModel;
import org.sjarvela.mollify.client.filesystem.foldermodel.FolderProvider;
import org.sjarvela.mollify.client.service.ResultCallback;
import org.sjarvela.mollify.client.service.ServiceError;
import org.sjarvela.mollify.client.service.request.listener.ResultListener;
import org.sjarvela.mollify.client.session.SessionInfo;
import org.sjarvela.mollify.client.session.file.FilePermission;

public class MainViewModel {
	private final SessionInfo session;
	private final List<Folder> rootFolders;

	private FolderModel folderModel;
	private List<File> files = new ArrayList();
	private List<Folder> folders = new ArrayList();
	private List<FileSystemItem> all = new ArrayList();
	private List<FileSystemItem> selected = new ArrayList();
	private FilePermission folderPermission = FilePermission.None;
	private final FileSystemItemProvider fileSystemItemProvider;
	private List<String> sharedFrom;
	private List<String> sharedTo;

	public MainViewModel(FileSystemItemProvider fileSystemItemProvider,
			SessionInfo session, FolderProvider folderProvider) {
		this.fileSystemItemProvider = fileSystemItemProvider;
		this.session = session;
		this.rootFolders = folderProvider.getRootFolders();

		clear();
	}

	public void clear() {
		folderModel = new FolderModel();

		folders.clear();
		files.clear();
		all.clear();
	}

	public SessionInfo getSession() {
		return session;
	}

	public FolderModel getFolderModel() {
		return folderModel;
	}

	public List<Folder> getRootFolders() {
		return rootFolders;
	}

	public List<Folder> getSubFolders() {
		return folders;
	}

	public FilePermission getFolderPermission() {
		return folderPermission;
	}

	public List<File> getFiles() {
		return files;
	}

	public List<FileSystemItem> getAllItems() {
		return all;
	}

	public boolean hasFolder() {
		return folderModel.getCurrentFolder() != null;
	}

	public Folder getCurrentFolder() {
		return folderModel.getCurrentFolder();
	}

	public void changeToRootFolder(Folder root, ResultListener resultListener) {
		folderModel.setRootFolder(root);
		refreshData(resultListener);
	}

	public void changeToSubfolder(Folder folder, ResultListener resultListener) {
		folderModel.descendIntoFolder(folder);
		refreshData(resultListener);
	}

	public void changeToFolder(int level, Folder folder,
			ResultListener resultListener) {
		folderModel.changeFolder(level, folder);
		refreshData(resultListener);
	}

	public void moveToParentFolder(ResultListener resultListener) {
		folderModel.ascend();
		refreshData(resultListener);
	}

	public void refreshData(ResultListener<FolderInfo> resultListener) {
		if (getCurrentFolder() == null) {
			FolderInfo result = new FolderInfo(FilePermission.ReadOnly,
					rootFolders, Collections.EMPTY_LIST, 0, 0, new ArrayList(),
					new ArrayList());
			onUpdateData(result);
			resultListener.onSuccess(result);
			return;
		}

		fileSystemItemProvider.getFilesAndFolders(
				getCurrentFolder(),
				createListener(resultListener,
						new ResultCallback<FolderInfo>() {
							public void onCallback(FolderInfo result) {
								onUpdateData(result);
							}
						}));
	}

	private void onUpdateData(FolderInfo data) {
		this.folders = data.getFolders();
		this.files = data.getFiles();
		this.folderPermission = data.getPermission();
		this.all = new ArrayList(data.getFolders());
		this.all.addAll(files);
		this.sharedFrom = data.getSharedFrom();
		this.sharedTo = data.getSharedTo();
	}

	private ResultListener createListener(final ResultListener listener,
			final ResultCallback resultCallback) {
		return new ResultListener<Object>() {
			public void onFail(ServiceError error) {
				listener.onFail(error);
			}

			public void onSuccess(Object result) {
				resultCallback.onCallback(result);
				listener.onSuccess(result);
			}
		};
	}

	public void setSelected(List<FileSystemItem> selected) {
		this.selected = selected;
	}

	public List<FileSystemItem> getSelectedItems() {
		return this.selected;
	}

	public void clearSelected() {
		this.selected.clear();
	}

	public boolean isShared(FileSystemItem t) {
		return sharedFrom.contains(t.getId()) || sharedTo.contains(t.getId());
	}
}
