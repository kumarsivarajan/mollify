/**
 * Copyright (c) 2008- Samuli Järvelä
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
 * this entire header must remain intact.
 */

package org.sjarvela.mollify.client.service.environment.php;

import java.util.Arrays;
import java.util.List;

import org.sjarvela.mollify.client.filesystem.DirectoriesAndFiles;
import org.sjarvela.mollify.client.filesystem.Directory;
import org.sjarvela.mollify.client.filesystem.DirectoryDetails;
import org.sjarvela.mollify.client.filesystem.File;
import org.sjarvela.mollify.client.filesystem.FileDetails;
import org.sjarvela.mollify.client.filesystem.FileSystemAction;
import org.sjarvela.mollify.client.filesystem.FileSystemItem;
import org.sjarvela.mollify.client.filesystem.FilesAndDirs;
import org.sjarvela.mollify.client.filesystem.js.JsDirectory;
import org.sjarvela.mollify.client.service.FileSystemService;
import org.sjarvela.mollify.client.service.ServiceError;
import org.sjarvela.mollify.client.service.environment.php.PhpService.RequestType;
import org.sjarvela.mollify.client.service.request.ResultListener;

import com.allen_sauer.gwt.log.client.Log;
import com.google.gwt.core.client.JsArray;
import com.google.gwt.http.client.URL;

public class PhpFileService implements FileSystemService {
	protected final PhpService service;

	enum FileDataAction {
		roots, files, directories, contents, details, upload_status
	};

	public PhpFileService(PhpService service) {
		this.service = service;
	}

	public void getDirectories(Directory parent,
			final ResultListener<List<Directory>> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Get directories: " + parent.getId());

		service.doRequest(getFileDataUrl(FileDataAction.directories, "dir=" + parent.getId()),
				new ResultListener<JsArray<JsDirectory>>() {

					public void onFail(ServiceError error) {
						listener.onFail(error);
					}

					public void onSuccess(JsArray<JsDirectory> result) {
						listener.onSuccess(FileSystemItem
								.createFromDirectories(result));
					}
				});
	}

	public void getRootDirectories(
			final ResultListener<List<Directory>> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Get root directories");

		service.doRequest(getFileDataUrl(FileDataAction.roots),
				new ResultListener<JsArray<JsDirectory>>() {
					public void onFail(ServiceError error) {
						listener.onFail(error);
					}

					public void onSuccess(JsArray<JsDirectory> result) {
						listener.onSuccess(FileSystemItem
								.createFromDirectories(result));
					}
				});
	}

	public void getDirectoriesAndFiles(final String folder,
			final ResultListener<FilesAndDirs> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Get directory contents: " + folder);

		service.doRequest(getFileDataUrl(FileDataAction.contents, "dir=" + folder),
				new ResultListener<DirectoriesAndFiles>() {

					public void onFail(ServiceError error) {
						listener.onFail(error);
					}

					public void onSuccess(DirectoriesAndFiles result) {
						listener.onSuccess(new FilesAndDirs(
								FileSystemItem.createFromDirectories(result
										.getDirectories()), FileSystemItem
										.createFromFiles(result.getFiles())));
					}

				});
	}

	public void getFileDetails(File item,
			ResultListener<FileDetails> resultListener) {
		if (Log.isDebugEnabled())
			Log.debug("Get file details: " + item.getId());

		service.doRequest(getFileDataUrl(FileDataAction.details, getFileItemTypeParam(item),
				"id=" + item.getId()), resultListener);
	}

	public void getDirectoryDetails(Directory item,
			ResultListener<DirectoryDetails> resultListener) {
		if (Log.isDebugEnabled())
			Log.debug("Get folder details: " + item.getId());

		service.doRequest(getFileDataUrl(FileDataAction.details, getFileItemTypeParam(item),
				"id=" + item.getId()), resultListener);
	}

	public void rename(FileSystemItem item, String newName,
			ResultListener<Boolean> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Rename " + item.getId() + " to [" + newName + "]");

		service.doRequest(getFileActionUrl(item, FileSystemAction.rename, "to="
				+ URL.encode(newName)), listener);
	}

	public void copy(File file, Directory directory,
			ResultListener<Boolean> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Copy " + file.getId() + " to [" + directory.getId()
					+ "]");

		service.doRequest(getFileActionUrl(file, FileSystemAction.copy, "to="
				+ directory.getId()), listener);
	}

	public void move(File file, Directory directory,
			ResultListener<Boolean> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Move " + file.getId() + " to [" + directory.getId()
					+ "]");

		service.doRequest(getFileActionUrl(file, FileSystemAction.move, "to="
				+ directory.getId()), listener);
	}

	public void delete(FileSystemItem item, ResultListener<Boolean> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Delete: " + item.getId());

		service.doRequest(getFileActionUrl(item, FileSystemAction.delete),
				listener);
	}

	public void createDirectory(Directory parentFolder, String folderName,
			ResultListener<Boolean> listener) {
		if (Log.isDebugEnabled())
			Log.debug("Create directory: [" + folderName + "]");

		service
				.doRequest(getFileActionUrl(parentFolder,
						FileSystemAction.create_folder, "name=" + folderName),
						listener);
	}

	public String getDownloadUrl(File file) {
		return getFileActionUrl(file, FileSystemAction.download);
	}

	public String getDownloadAsZipUrl(FileSystemItem item) {
		return getFileActionUrl(item, FileSystemAction.download_as_zip);
	}

	public String getFileActionUrl(FileSystemItem item,
			FileSystemAction action, String... params) {
		return getFileActionUrl(item, action, Arrays.asList(params));
	}

	public String getFileActionUrl(FileSystemItem item,
			FileSystemAction action, List<String> params) {
		if (item.isEmpty()) {
			throw new RuntimeException("No item defined, action "
					+ action.name());
		}
		if (!action.isApplicable(item)) {
			throw new RuntimeException("Invalid action request "
					+ action.name());
		}

		params.add(0, "type=" + action.name());
		params.add(1, "id=" + item.getId());
		params.add(2, getFileItemTypeParam(item));

		return service.getUrl(RequestType.file_action, params);
	}

	protected String getFileDataUrl(FileDataAction action, String... params) {
		return getFileDataUrl(action, Arrays.asList(params));
	}

	private String getFileDataUrl(FileDataAction action, List<String> params) {
		params.add(0, "action=" + action.name());
		return service.getUrl(RequestType.file_data, params);
	}
	
	private String getFileItemTypeParam(FileSystemItem item) {
		return "item_type=" + (item.isFile() ? "f" : "d");
	}
}
