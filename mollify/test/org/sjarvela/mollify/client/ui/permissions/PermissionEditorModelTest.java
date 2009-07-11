/**
 * Copyright (c) 2008- Samuli Järvelä
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
 * this entire header must remain intact.
 */

package org.sjarvela.mollify.client.ui.permissions;

import java.util.Arrays;
import java.util.Collections;

import org.junit.Test;
import org.sjarvela.mollify.client.Callback;
import org.sjarvela.mollify.client.filesystem.File;
import org.sjarvela.mollify.client.filesystem.FileSystemItem;
import org.sjarvela.mollify.client.session.file.FileItemUserPermission;
import org.sjarvela.mollify.client.session.file.FilePermissionMode;
import org.sjarvela.mollify.client.session.user.User;
import org.sjarvela.mollify.client.session.user.UserPermissionMode;
import org.sjarvela.mollify.client.testutil.MockConfigurationService;
import org.sjarvela.mollify.client.testutil.MockFileSystemService;

import com.google.gwt.junit.client.GWTTestCase;

public class PermissionEditorModelTest extends GWTTestCase implements Callback {
	private MockConfigurationService configurationService;
	private MockFileSystemService fileSystemService;
	private PermissionEditorModel model;

	private FileSystemItem item = new File("A", "name", "B", "ext", 1024);
	private User user1;
	private User user2;
	private User user3;

	private boolean callbackCalled = false;

	@Override
	public String getModuleName() {
		return "org.sjarvela.mollify.Client";
	}

	public void gwtSetUp() {
		user1 = User.create("u1", "user1", UserPermissionMode.Admin);
		user2 = User.create("u2", "user2", UserPermissionMode.ReadWrite);
		user3 = User.create("u3", "user3", UserPermissionMode.ReadOnly);

		configurationService = new MockConfigurationService();
		configurationService.setUsers(Arrays.asList(user1, user2, user3));

		fileSystemService = new MockFileSystemService();
		fileSystemService.setPermissions(Arrays.asList(createPermission(null,
				FilePermissionMode.ReadOnly), createPermission(user1,
				FilePermissionMode.ReadWrite), createPermission(user2,
				FilePermissionMode.ReadOnly)));
		model = new PermissionEditorModel(item, configurationService,
				fileSystemService);

		refresh();
	}

	@Test
	public void testBasics() {
		assertEquals(item, model.getItem());
	}

	@Test
	public void testRefresh() {
		assertEquals(3, model.getUsers().size());
		assertTrue(model.getUsers().contains(user1));
		assertTrue(model.getUsers().contains(user2));
		assertTrue(model.getUsers().contains(user3));

		assertEquals(FilePermissionMode.ReadOnly, model.getDefaultPermission());

		assertEquals(2, model.getUserSpecificPermissions().size());
		assertEquals(FilePermissionMode.ReadWrite, getPermission(user1));
		assertEquals(FilePermissionMode.ReadOnly, getPermission(user2));
	}

	@Test
	public void testDefaults() {
		fileSystemService.setPermissions(Collections.EMPTY_LIST);
		model.refresh(this);

		assertEquals(FilePermissionMode.None, model.getDefaultPermission());
		assertEquals(0, model.getUserSpecificPermissions().size());
	}

	@Test
	public void testUpdates() {
		FileItemUserPermission permission = createPermission(user3,
				FilePermissionMode.ReadOnly);

		model.addPermission(permission);
		assertEquals(3, model.getUserSpecificPermissions().size());
		assertEquals(FilePermissionMode.ReadOnly, getPermission(user3));

		permission = createPermission(user3, FilePermissionMode.ReadWrite);
		model.editPermission(permission);
		assertEquals(3, model.getUserSpecificPermissions().size());
		assertEquals(FilePermissionMode.ReadWrite, getPermission(user3));

		model.removePermission(permission);
		assertEquals(2, model.getUserSpecificPermissions().size());
		assertNull(getUserPermission(user3));
	}

	@Test
	public void testCommit() {
		FileItemUserPermission newPermission = createPermission(user3,
				FilePermissionMode.ReadOnly);
		model.addPermission(newPermission);
		model.editPermission(newPermission);

		FileItemUserPermission removedPermission = getUserPermission(user1);
		model.removePermission(removedPermission);

		FileItemUserPermission editedPermission = getUserPermission(user2);
		model.editPermission(editedPermission);

		commit();

		assertEquals(1, fileSystemService.getNewPermissions().size());
		assertEquals(newPermission, fileSystemService.getNewPermissions()
				.get(0));

		assertEquals(1, fileSystemService.getRemovedPermissions().size());
		assertEquals(removedPermission, fileSystemService
				.getRemovedPermissions().get(0));

		assertEquals(1, fileSystemService.getModifiedPermissions().size());
		assertEquals(editedPermission, fileSystemService
				.getModifiedPermissions().get(0));
	}

	private FilePermissionMode getPermission(User user) {
		FileItemUserPermission permission = getUserPermission(user);
		if (permission == null)
			return null;
		return permission.getPermission();
	}

	private FileItemUserPermission getUserPermission(User user) {
		for (FileItemUserPermission userPermission : model
				.getUserSpecificPermissions())
			if (user.equals(userPermission.getUser()))
				return userPermission;
		return null;
	}

	private FileItemUserPermission createPermission(User user,
			FilePermissionMode permission) {
		return new FileItemUserPermission(item, user, permission);
	}

	public void onCallback() {
		callbackCalled = true;
	}

	private void refresh() {
		callbackCalled = false;
		model.refresh(this);
		assertTrue(callbackCalled);
	}

	private void commit() {
		callbackCalled = false;
		model.commit(this);
		assertTrue(callbackCalled);
	}

}
