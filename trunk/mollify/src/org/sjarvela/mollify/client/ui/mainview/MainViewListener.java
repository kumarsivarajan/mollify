package org.sjarvela.mollify.client.ui.mainview;

import org.sjarvela.mollify.client.filesystem.js.JsFilesystemItem;
import org.sjarvela.mollify.client.filesystem.js.JsFolder;

import com.google.gwt.core.client.JavaScriptObject;

public interface MainViewListener {
	void onViewLoaded();

	void onHomeSelected();

	void onSubFolderSelected(JsFolder f);

	void onFolderSelected(int level, JsFolder f);

	void onRefresh();

	void onCreateFolder(String name);

	void getItemDetails(JsFilesystemItem item, JavaScriptObject callback);

	void getSessionActions(JavaScriptObject callback);

	void onChangePassword(String oldPassword, String newPassword,
			JavaScriptObject callback);
}